'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { BybitTicker, BybitInstrumentInfo } from '@/services/bybit/types';
import { fetchBybitTickers, getInstrumentsInfo } from '@/services/bybit/api';
import { TickerCategory } from '@/stores/sortStore';
import { useNavigationStore } from '@/stores/navigationStore';

interface DisplayTicker extends BybitTicker {
  priceEffect?: 'up' | 'down' | 'flat';
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

const REFRESH_INTERVAL = 1000;
const PRICE_EFFECT_DURATION = 200;

interface TickerDetailPageProps {
  params: {
    category: TickerCategory;
    symbol: string;
  };
}

export default function TickerDetailPage({ params }: TickerDetailPageProps) {
  const { category, symbol } = params;

  const theme = useTheme();
  const router = useRouter();
  const { setAppbarTitle, setLeftButtonAction, setShowMenuButton } = useNavigationStore();
  const [ticker, setTicker] = useState<DisplayTicker | null>(null);
  const [instrumentInfo, setInstrumentInfo] = useState<BybitInstrumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prevTickerRef = useRef<BybitTicker | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchTickerData = useCallback(async (): Promise<void> => {
    try {
      const tickers = await fetchBybitTickers(category as TickerCategory);
      const foundTicker = tickers.find(t => t.symbol === decodeURIComponent(symbol));

      if (foundTicker) {
        let priceEffect: 'up' | 'down' | 'flat' | undefined = undefined;
        if (prevTickerRef.current && prevTickerRef.current.lastPrice && foundTicker.lastPrice) {
          const prevPriceNum = parseFloat(prevTickerRef.current.lastPrice);
          const currentPriceNum = parseFloat(foundTicker.lastPrice);
          if (currentPriceNum > prevPriceNum) priceEffect = 'up';
          else if (currentPriceNum < prevPriceNum) priceEffect = 'down';
          else priceEffect = 'flat';
        }

        const displayTicker: DisplayTicker = { ...foundTicker, priceEffect };
        setTicker(displayTicker);
        prevTickerRef.current = foundTicker;

        if (priceEffect === 'up' || priceEffect === 'down') {
            const existingTimeout = timeoutRef.current.get(foundTicker.symbol);
            if (existingTimeout) clearTimeout(existingTimeout);
            const newTimeout = setTimeout(() => {
                setTicker(prev => prev ? { ...prev, priceEffect: 'flat' } : null);
                timeoutRef.current.delete(foundTicker.symbol);
            }, PRICE_EFFECT_DURATION);
            timeoutRef.current.set(foundTicker.symbol, newTimeout);
        }
      } else {
        setError('Ticker not found.');
      }
    } catch (err: any) {
      console.error(`Error fetching ${category}/${symbol} ticker:`, err.message);
      setError(prevError => prevError || err.message || 'An unknown error occurred while fetching ticker');
    } 
  }, [category, symbol]);

  const fetchInstrumentDetails = useCallback(async () => {
    try {
        const decodedSymbol = decodeURIComponent(symbol);
        const infoList = await getInstrumentsInfo(category as string, decodedSymbol);
        if (infoList && infoList.length > 0) {
            setInstrumentInfo(infoList[0]);
        } else {
            setError(prevError => prevError || 'Instrument info not found.');
        }
    } catch (err: any) {
        console.error(`Error fetching instrument info for ${symbol}:`, err.message);
        setError(prevError => prevError || err.message || 'An unknown error occurred while fetching instrument info');
    }
}, [category, symbol]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchTickerData(), fetchInstrumentDetails()]);
    setLoading(false);
  }, [fetchTickerData, fetchInstrumentDetails]);


  useEffect(() => {
    if (category && symbol) {
        setAppbarTitle(decodeURIComponent(symbol));
        setLeftButtonAction(() => router.back());
        setShowMenuButton(false);

        fetchAllData();
        intervalRef.current = setInterval(fetchTickerData, REFRESH_INTERVAL);
    } else {
      setLoading(false);
      setError('Category or Symbol not provided.');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
       timeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
       timeoutRef.current.clear();

       setAppbarTitle('Tickers');
       setLeftButtonAction(null);
       setShowMenuButton(true);
    };

  }, [category, symbol, fetchAllData, fetchTickerData, setAppbarTitle, setLeftButtonAction, setShowMenuButton, router]);

  const renderTickerDetails = (ticker: DisplayTicker, tickSize?: string) => {
    const orderedKeys: (keyof BybitTicker)[] = [
        'symbol',
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

    return orderedKeys
        .filter(key => ticker[key] !== undefined && ticker[key] !== null && String(ticker[key]).trim() !== '')
        .map((key) => {
      const value = ticker[key];
      let displayValue = String(value); 
      let valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;

      if (key === 'lastPrice') {
        displayValue = formatNumberWithCommas(value, tickSize);
         const lastPriceValueSx = {
             textAlign: 'right',
             border: ticker.priceEffect === 'up' ? `1px solid ${theme.palette.success.main}` : ticker.priceEffect === 'down' ? `1px solid ${theme.palette.error.main}` : '1px solid transparent',
             padding: '0 4px',
             display: 'inline-block',
         };
         valueTypography = <Typography component="span" sx={lastPriceValueSx}>{displayValue}</Typography>;
      } else if (['bid1Price', 'ask1Price', 'usdIndexPrice', 'indexPrice', 'markPrice', 'prevPrice24h', 'highPrice24h', 'lowPrice24h', 'prevPrice1h', 'predictedDeliveryPrice'].includes(key)) {
        displayValue = formatNumberWithCommas(value, tickSize); // Apply tickSize formatting to other price fields as well
         valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
      } else if (['openInterest', 'openInterestValue', 'ask1Size', 'bid1Size', 'basis'].includes(key)) {
        displayValue = formatNumberWithCommas(value); // Standard comma formatting for non-price, non-volume/turnover numbers
         valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
      } else if (key === 'volume24h' || key === 'turnover24h') {
         displayValue = formatVolumeOrTurnover(value);
         valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
      } else if (key === 'price24hPcnt') {
        if (typeof value === 'string') { 
            displayValue = value.endsWith('%') ? value : `${value}%`;
            const numericPart = parseFloat(value.replace(/[+%]/g, ''));
            let color = 'text.primary';
            if (!isNaN(numericPart)) {
                if (numericPart > 0) color = 'success.main';
                else if (numericPart < 0) color = 'error.main';
            }
            valueTypography = <Typography component="span" sx={{ color: color, flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
        } else {
            displayValue = 'N/A';
            valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
        }
      } else if (key === 'nextFundingTime' || key === 'deliveryTime') {
        displayValue = formatTimestamp(String(value));
        valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
      }

      return (
        <Box key={key} sx={{
            marginBottom: 1,
            width: { xs: '100%', sm: 'calc(50% - 8px)' },
            marginRight: { xs: 0, sm: key === 'usdIndexPrice' || (orderedKeys.indexOf(key as keyof BybitTicker) % 2 !== 0) ? 0 : '16px' }, 
            wordBreak: 'break-word',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0'
        }}>
            <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', marginRight: 1, textAlign: 'left' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</Typography>
            {valueTypography}
        </Box>
      );
    });
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ marginY: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && ticker && (
          <Box sx={{ marginTop: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
                 <Box sx={{
                    marginBottom: 1, 
                    wordBreak: 'break-word', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                     width: { xs: '100%', sm: 'calc(50% - 8px)' },
                     marginRight: { xs: 0, sm: '16px' },
                      padding: '4px 8px'
                }}>
                    <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', marginRight: 1, textAlign: 'left' }}>Category:</Typography>
                     <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{decodeURIComponent(category)}</Typography>
                </Box>
                {renderTickerDetails(ticker, instrumentInfo?.priceFilter.tickSize)}
            </Box>
          </Box>
        )}

        {!loading && !ticker && !error && (
             <Typography sx={{textAlign: 'center', color: 'text.secondary', mt: 3}}>
                No ticker data available.
            </Typography>
        )}

      </Paper>
    </Container>
  );
}
