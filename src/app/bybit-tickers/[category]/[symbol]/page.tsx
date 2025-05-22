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
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { BybitTicker, BybitInstrumentInfo, FundingHistoryEntry } from '@/services/bybit/types';
import { fetchBybitTickers, getInstrumentsInfo, fetchFundingRateHistory } from '@/services/bybit/api';
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
const FUNDING_HISTORY_LIMIT = 300;

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
  const [fundingHistory, setFundingHistory] = useState<FundingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  const [fundingHistoryError, setFundingHistoryError] = useState<string | null>(null);
  const [loadingFundingHistory, setLoadingFundingHistory] = useState(true);


  const prevTickerRef = useRef<BybitTicker | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastUsdIndexPriceRef = useRef<string | null>(null);

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

        if (foundTicker.usdIndexPrice && foundTicker.usdIndexPrice.trim() !== '') {
          lastUsdIndexPriceRef.current = foundTicker.usdIndexPrice;
        } else if (lastUsdIndexPriceRef.current) {
          foundTicker.usdIndexPrice = lastUsdIndexPriceRef.current;
        }

        const displayTicker: DisplayTicker = { ...foundTicker, priceEffect };
        setTicker(displayTicker);
        prevTickerRef.current = { ...foundTicker };

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
        setError(prevError => prevError || 'Ticker not found.');
      }
    } catch (err: any) {
      console.error(`Error fetching ${category}/${symbol} ticker:`, err.message);
      setError(prevError => prevError || err.message || 'An unknown error occurred while fetching ticker');
    }
  }, [category, symbol]);

  const fetchInstrumentInfoData = useCallback(async (): Promise<void> => {
    try {
      const decodedSymbol = decodeURIComponent(symbol);
      const instrumentInfoData = await getInstrumentsInfo(category as string, decodedSymbol);
      if (instrumentInfoData && instrumentInfoData.length > 0) {
        setInstrumentInfo(instrumentInfoData[0]);
      } else {
        setInstrumentError('Instrument information not found.');
      }
    } catch (err: any) {
      console.error(`Error fetching instrument info for ${category}/${symbol}:`, err.message);
      setInstrumentError(err.message || 'An unknown error occurred while fetching instrument information');
    }
  }, [category, symbol]);

  const fetchFundingHistoryData = useCallback(async (): Promise<void> => {
    if (category === 'spot') {
      setLoadingFundingHistory(false);
      setFundingHistory([]);
      return;
    }
    setLoadingFundingHistory(true);
    setFundingHistoryError(null);
    try {
      const decodedSymbol = decodeURIComponent(symbol);
      const history = await fetchFundingRateHistory(category as 'linear' | 'inverse', decodedSymbol, FUNDING_HISTORY_LIMIT);
      setFundingHistory(history);
    } catch (err: any) {
      console.error(`Error fetching funding rate history for ${category}/${symbol}:`, err.message);
      setFundingHistoryError(err.message || 'An unknown error occurred while fetching funding rate history');
    } finally {
      setLoadingFundingHistory(false);
    }
  }, [category, symbol]);


  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInstrumentError(null);
    setFundingHistoryError(null);
    
    const promises = [fetchTickerData(), fetchInstrumentInfoData()];
    if (category !== 'spot') {
        promises.push(fetchFundingHistoryData());
    }

    await Promise.all(promises);
    setLoading(false);
  }, [fetchTickerData, fetchInstrumentInfoData, fetchFundingHistoryData, category]);


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

  const renderTickerDetails = (tickerToRender: DisplayTicker, tickSize?: string) => {
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
        .filter(key => tickerToRender[key] !== undefined && tickerToRender[key] !== null && String(tickerToRender[key]).trim() !== '')
        .map((key) => {
      const value = tickerToRender[key];
      let displayValue = String(value);
      let valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;

      if (key === 'lastPrice') {
        displayValue = formatNumberWithCommas(value, tickSize);
         const lastPriceValueSx = {
             textAlign: 'right',
             border: tickerToRender.priceEffect === 'up' ? `1px solid ${theme.palette.success.main}` : tickerToRender.priceEffect === 'down' ? `1px solid ${theme.palette.error.main}` : '1px solid transparent',
             padding: '0 4px',
             display: 'inline-block',
         };
         valueTypography = <Typography component="span" sx={lastPriceValueSx}>{displayValue}</Typography>;
      } else if (['bid1Price', 'ask1Price', 'usdIndexPrice', 'indexPrice', 'markPrice', 'prevPrice24h', 'highPrice24h', 'lowPrice24h', 'prevPrice1h', 'predictedDeliveryPrice'].includes(key)) {
        displayValue = formatNumberWithCommas(value, tickSize);
         valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
      } else if (['openInterest', 'openInterestValue', 'ask1Size', 'bid1Size', 'basis', 'fundingRate'].includes(key)) {
        // Added fundingRate here for consistent numeric formatting if needed, though it's often a small decimal
        displayValue = formatNumberWithCommas(value); 
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

 const renderInstrumentInfoDetails = (info: BybitInstrumentInfo) => {
    const camelToTitleCase = (camelCase: string) => camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());

    const mainKeys: (keyof BybitInstrumentInfo)[] = [
        'symbol', 'contractType', 'status', 'baseCoin', 'quoteCoin', 'settleCoin',
        'launchTime', 'deliveryTime', 'issueTime', 'fundingInterval', 'unifiedMarginTrade', 'marketStatus'
    ];

    const renderNestedObject = (obj: any, title: string) => {
      if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return null;
      return (
        <Box sx={{ mt: 2, mb: 1, width: '100%' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>{title}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
            {Object.entries(obj).map(([key, value]) => (
              <Box key={key} sx={{
                  marginBottom: 1,
                  width: { xs: '100%', sm: 'calc(50% - 8px)' },
                  marginRight: { xs: 0, sm: (Object.keys(obj).indexOf(key) % 2 !== 0) ? 0 : '16px' },
                  wordBreak: 'break-word',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0'
              }}>
                  <Typography variant="body2" component="span" sx={{ fontWeight: 'bold', marginRight: 1, textAlign: 'left' }}>{camelToTitleCase(key)}</Typography>
                  <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{String(value)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      );
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{textAlign: 'center', fontWeight: 'bold' }}>Instrument Information</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
                {mainKeys.map(key => {
                    const value = info[key];
                    if (value === undefined || value === null || String(value).trim() === '') return null;
                    let displayValue = String(value);
                    if (key === 'launchTime' || key === 'deliveryTime' || key === 'issueTime') {
                        displayValue = formatTimestamp(String(value));
                    } else if (typeof value === 'boolean') {
                        displayValue = value ? 'Yes' : 'No';
                    }

                    return (
                        <Box key={key} sx={{
                            marginBottom: 1,
                            width: { xs: '100%', sm: 'calc(50% - 8px)' },
                            marginRight: { xs: 0, sm: (mainKeys.indexOf(key) % 2 !== 0) ? 0 : '16px' },
                            wordBreak: 'break-word',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 0'
                        }}>
                            <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', marginRight: 1, textAlign: 'left' }}>{camelToTitleCase(key)}</Typography>
                            <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>
                        </Box>
                    );
                })}
            </Box>
            {renderNestedObject(info.priceFilter, 'Price Filter')}
            {renderNestedObject(info.lotSizeFilter, 'Lot Size Filter')}
            {renderNestedObject(info.leverageFilter, 'Leverage Filter')}
             {info.note && info.note.trim() !== '' && (
                <Box sx={{ mt: 2, width: '100%' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Note</Typography>
                    <Typography variant="body2">{info.note}</Typography>
                </Box>
            )}
        </Box>
    );
  };

  const renderFundingRateHistoryDetails = (history: FundingHistoryEntry[]) => {
    if (category === 'spot') return null;
    if (loadingFundingHistory) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
          <CircularProgress size={30} />
        </Box>
      );
    }
    if (fundingHistoryError) {
      return <Alert severity="warning" sx={{ marginY: 2 }}>Failed to load funding rate history: {fundingHistoryError}</Alert>;
    }
    if (!history || history.length === 0) {
      return <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>No funding rate history available.</Typography>;
    }

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold' }}>Funding Rate History</Typography>
        <List dense sx={{ maxHeight: 300, overflow: 'auto', border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
          {history.map((entry, index) => (
            <ListItem key={index} divider={index < history.length -1 } sx={{ display: 'flex', justifyContent: 'space-between', paddingY: '2px'}}>
              <ListItemText 
                primary={formatTimestamp(entry.fundingRateTimestamp)} 
                secondary={`Rate: ${entry.fundingRate}`}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
                sx={{flex: '1 1 auto', textAlign: 'left'}}
              />
               <Typography variant="body2" sx={{flex: '0 0 auto', textAlign: 'right', fontWeight: parseFloat(entry.fundingRate) < 0 ? 'bold' : 'normal', color: parseFloat(entry.fundingRate) < 0 ? theme.palette.error.main : theme.palette.success.main }}>
                {(parseFloat(entry.fundingRate) * 100).toFixed(4)}%
              </Typography>
            </ListItem>
          ))}
        </List>
      </Box>
    );
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
             <Typography variant="h5" gutterBottom sx={{textAlign: 'center', fontWeight: 'bold' }}>Market Ticker Information</Typography>
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
                    <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', marginRight: 1, textAlign: 'left' }}>Category</Typography>
                     <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{decodeURIComponent(category)}</Typography>
                </Box>
                {renderTickerDetails(ticker, instrumentInfo?.priceFilter?.tickSize)}
            </Box>
          </Box>
        )}

        {!loading && !ticker && !error && (
             <Typography sx={{textAlign: 'center', color: 'text.secondary', mt: 3}}>
                No ticker data available.
            </Typography>
        )}
        
        {/* Funding Rate History Section - only for non-spot */}
        {category !== 'spot' && !loading && (
            <>
                <Divider sx={{ my: 3 }} />
                {renderFundingRateHistoryDetails(fundingHistory)}
            </>
        )}
         {/* Separate loading/error for funding history if main data loaded */} 
        {category !== 'spot' && loading && loadingFundingHistory && !error && (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', mt: 2 }}>
                <CircularProgress size={30} />
                <Typography sx={{ml: 1}}>Loading Funding History...</Typography>
            </Box>
        )}
        {category !== 'spot' && !loading && fundingHistoryError && !error && (
             <Alert severity="warning" sx={{ marginY: 2, mt: 2 }}>Failed to load funding rate history: {fundingHistoryError}</Alert>
        )}


        {instrumentError && (
            <Alert severity="warning" sx={{ marginY: 2, mt: (ticker || (category !=='spot' && fundingHistory.length > 0)) ? 2 : 0 }}>
                Could not load instrument details: {instrumentError}
            </Alert>
        )}

        {!loading && instrumentInfo && (
            <>
                <Divider sx={{ my: 3 }} />
                {renderInstrumentInfoDetails(instrumentInfo)}
            </>
        )}
         {!loading && !instrumentInfo && !instrumentError && ticker && (
            <Typography sx={{textAlign: 'center', color: 'text.secondary', mt: 3}}>
                No instrument information available.
            </Typography>
        )}

      </Paper>
    </Container>
  );
}
