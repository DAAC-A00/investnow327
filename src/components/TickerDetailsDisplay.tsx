import React from 'react';
import { Box, Typography, Divider, useTheme } from '@mui/material';
import { BybitTicker } from '@/services/bybit/types';

interface DisplayTicker extends BybitTicker {
    priceEffect?: 'up' | 'down' | 'flat';
  }

interface TickerDetailsDisplayProps {
    ticker: DisplayTicker; // The ticker data to display
    tickSize?: string; // The tick size for formatting
}

const formatNumberWithCommas = (value: string | number | undefined, tickSize?: string): string => {
    if (value === undefined || value === null) return 'N/A';
    let numStr = String(value);
  
    if (tickSize) {
      const decimalPlaces = (tickSize.split('.')[1] || '').length;
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        numStr = num.toFixed(decimalPlaces);
      }
    } else {
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
          if (Math.abs(num) < 1) {
              numStr = num.toFixed(6);
          } else if (Math.abs(num) < 100) {
              numStr = num.toFixed(4);
          } else {
              numStr = num.toFixed(2);
          }
      }
    }
  
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

const formatVolumeOrTurnover = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    const num = parseFloat(String(value));
    if (isNaN(num)) return 'N/A';
  
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      let formattedValue;
      if (num >= 100) {
        formattedValue = num.toFixed(2);
      } else if (num >= 10) {
        formattedValue = num.toFixed(3);
      } else {
         formattedValue = num.toFixed(4);
      }
       const parts = formattedValue.split('.');
       parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
       return parts.join('.');
    }
};

const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return 'N/A';
    const numTimestamp = parseInt(timestamp, 10);
    if (isNaN(numTimestamp) || numTimestamp === 0) return 'N/A';
    try {
        return new Date(numTimestamp).toLocaleString();
    } catch (e) {
        return 'Invalid Date';
    }
};

const TickerDetailsDisplay: React.FC<TickerDetailsDisplayProps> = React.memo(({ ticker, tickSize }) => {
    const theme = useTheme();

    const renderDetailItem = (label: string, value: React.ReactNode) => {
        // Apply conditional border for lastPrice, overriding the default transparent border
        const itemSx:any = {
            width: { xs: '100%', sm: `calc(50% - ${theme.spacing(0.5)})` },
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingY: '4px',
            boxSizing: 'border-box',
            border: label === 'Last Price' && (ticker.priceEffect === 'up' || ticker.priceEffect === 'down') 
                ? `1px solid ${ticker.priceEffect === 'up' ? theme.palette.success.main : theme.palette.error.main}`
                : '1px solid transparent', // Default transparent border
        };

        return (
            <Box key={label} sx={itemSx}>
                <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', marginRight: 1, textAlign: 'left' }}>
                    {label}:
                </Typography>
                <Typography component="span" sx={{ textAlign: 'right', wordBreak: 'break-all', padding: '0 4px' }}>{/* Added padding here */}
                    {value}
                </Typography>
            </Box>
        );
      };

    const orderedKeys: (keyof BybitTicker)[] = [
        'lastPrice',
        'indexPrice',
        'markPrice',
        'prevPrice24h',
        'price24hPcnt',
        'highPrice24h',
        'lowPrice24h',
        'prevPrice1h',
        'bid1Price',
        'bid1Size',
        'ask1Price',
        'ask1Size',
        'volume24h',
        'turnover24h',
        'openInterest',
        'openInterestValue',
        'fundingRate',
        'nextFundingTime',
        'basisRate',
        'deliveryFeeRate',
        'deliveryTime',
        'predictedDeliveryPrice',
        'basis',
        'usdIndexPrice',
    ];

    return (
        <>
            <Divider sx={{ marginY: 2 }}><Typography variant="h6">Market Data</Typography></Divider>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing(1) }}>
                {orderedKeys
                    .filter(key => ticker[key] !== undefined && ticker[key] !== null && String(ticker[key]).trim() !== '')
                    .map((key) => {
                        const value = ticker[key];
                        let displayValue = String(value); 
                        let valueTypographyProps: any = { component: "span", sx: { textAlign: 'right', wordBreak: 'break-all', padding: '0 4px' }}; // Added padding here

                        if (key === 'lastPrice') {
                            displayValue = formatNumberWithCommas(value, tickSize);
                            // The padding is already added in valueTypographyProps.sx
                            valueTypographyProps.sx = {
                                ...valueTypographyProps.sx,
                                display: 'inline-block',
                            };
                        } else if (['bid1Price', 'ask1Price', 'usdIndexPrice', 'indexPrice', 'markPrice', 'prevPrice24h', 'highPrice24h', 'lowPrice24h', 'prevPrice1h', 'predictedDeliveryPrice'].includes(key)) {
                            displayValue = formatNumberWithCommas(value, tickSize);
                        } else if (['openInterest', 'openInterestValue', 'ask1Size', 'bid1Size', 'basis'].includes(key)) {
                             displayValue = formatNumberWithCommas(value);
                        } else if (key === 'volume24h' || key === 'turnover24h') {
                             displayValue = formatVolumeOrTurnover(value);
                        } else if (key === 'price24hPcnt') {
                            if (typeof value === 'string') { 
                                displayValue = value; 
                                const numericPart = parseFloat(value.replace(/[+%]/g, ''));
                                if (!isNaN(numericPart)) {
                                    if (numericPart > 0) valueTypographyProps.sx.color = 'success.main';
                                    else if (numericPart < 0) valueTypographyProps.sx.color = 'error.main';
                                }
                            } else {
                                displayValue = 'N/A';
                            }
                        } else if (key === 'nextFundingTime' || key === 'deliveryTime') {
                            displayValue = formatTimestamp(String(value));
                        }
                        const label = key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
                        
                        return renderDetailItem(label, <Typography {...valueTypographyProps}>{displayValue}</Typography>);
                    })}
            </Box>
        </>
    );
});

export default TickerDetailsDisplay;
