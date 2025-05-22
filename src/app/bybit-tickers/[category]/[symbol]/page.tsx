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
  Tabs,
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { BybitTicker, BybitInstrumentInfo, FundingHistoryEntry } from '@/services/bybit/types';
import { fetchBybitTickers, getInstrumentsInfo, fetchFundingRateHistory } from '@/services/bybit/api';
import { TickerCategory } from '@/stores/sortStore';
import { useNavigationStore } from '@/stores/navigationStore';

interface DisplayTicker extends BybitTicker {
  priceEffect?: 'up' | 'down' | 'flat';
}

// Updated interface for processed funding history entries
interface ProcessedFundingHistoryEntry {
  fundingRateTimestamp: string;
  // Stores the 8-hour rate as a number (already multiplied by 100 from api.ts)
  // e.g., if api.ts returns "+0.0100" for fundingRate, this will be 0.01
  numericRate8h: number; 
  // Stores the original string from api.ts, e.g., "+0.0100"
  originalFundingRateFromApi: string; 
  isNegative: boolean;
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
  const [fundingHistory, setFundingHistory] = useState<ProcessedFundingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  const [fundingHistoryError, setFundingHistoryError] = useState<string | null>(null);
  const [loadingFundingHistory, setLoadingFundingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showAnnualizedRate, setShowAnnualizedRate] = useState(true);


  const prevTickerRef = useRef<BybitTicker | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastUsdIndexPriceRef = useRef<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAnnualizedRateToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowAnnualizedRate(event.target.checked);
  };

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
      // fetchFundingRateHistory from api.ts now returns FundingHistoryEntry[] 
      // where fundingRate is a string like "+0.0100" or "-0.0200"
      const historyFromApi = await fetchFundingRateHistory(category as 'linear' | 'inverse', decodedSymbol, FUNDING_HISTORY_LIMIT);
      
      const processedHistory: ProcessedFundingHistoryEntry[] = historyFromApi.map(entry => {
        const originalRateStr = entry.fundingRate; // This is like "+0.0100"
        const numericRate = parseFloat(originalRateStr); // Parses to 0.01 or -0.02
        
        let isActuallyNegative = false;
        if (!isNaN(numericRate)) {
            isActuallyNegative = numericRate < 0;
        } else {
            // Fallback for parsing failure, though api.ts should format correctly
            isActuallyNegative = originalRateStr.startsWith('-');
        }

        return {
          fundingRateTimestamp: entry.fundingRateTimestamp,
          numericRate8h: isNaN(numericRate) ? 0 : numericRate, // Store the number like 0.01 (which is 0.01%)
          originalFundingRateFromApi: originalRateStr, // Store "+0.0100"
          isNegative: isActuallyNegative,
        };
      });
      setFundingHistory(processedHistory);
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
    
    const baseSx: any = { flexGrow: 1, textAlign: 'right', border: '1px solid transparent', padding: '0 4px', display: 'inline-block' }; // Use any for flexibility or define a more complex type

    return orderedKeys
        .filter(key => tickerToRender[key] !== undefined && tickerToRender[key] !== null && String(tickerToRender[key]).trim() !== '')
        .map((key) => {
      const value = tickerToRender[key];
      let displayValue = String(value);
      let typographySx = { ...baseSx }; // Start with baseSx

      if (key === 'lastPrice') {
        displayValue = formatNumberWithCommas(value, tickSize);
        typographySx = {
            ...baseSx, // Ensure all base properties are carried over
            border: tickerToRender.priceEffect === 'up' ? `1px solid ${theme.palette.success.main}` 
                           : tickerToRender.priceEffect === 'down' ? `1px solid ${theme.palette.error.main}` 
                           : '1px solid transparent',
        };
      } else if (['bid1Price', 'ask1Price', 'usdIndexPrice', 'indexPrice', 'markPrice', 'prevPrice24h', 'highPrice24h', 'lowPrice24h', 'prevPrice1h', 'predictedDeliveryPrice'].includes(key)) {
        displayValue = formatNumberWithCommas(value, tickSize);
      } else if (['openInterest', 'openInterestValue', 'ask1Size', 'bid1Size', 'basis'].includes(key)) {
        displayValue = formatNumberWithCommas(value);
      } else if (key === 'fundingRate') { // fundingRate from ticker is a direct number string, format it with sign and % for ticker display
        const numericRate = parseFloat(value as string);
        if(!isNaN(numericRate)){
            const rateTimes100 = numericRate * 100;
            displayValue = (rateTimes100 >= 0 ? '+' : '') + rateTimes100.toFixed(4) + '%';
            typographySx = { ...typographySx, color: rateTimes100 < 0 ? theme.palette.error.main : theme.palette.success.main };
        } else {
            displayValue = 'N/A';
        }
      }else if (key === 'volume24h' || key === 'turnover24h') {
         displayValue = formatVolumeOrTurnover(value);
      } else if (key === 'price24hPcnt') {
        // value for price24hPcnt from fetchBybitTickers is already like "+2.50" or "-1.00"
        const numericPart = parseFloat(String(value).replace(/[+%]/g, '')); // remove sign for color check
        displayValue = String(value) + '%'; // Append % sign
        if (!isNaN(numericPart)) {
            typographySx = { ...typographySx, color: numericPart > 0 ? theme.palette.success.main : numericPart < 0 ? theme.palette.error.main : 'text.primary' };
        }
      } else if (key === 'nextFundingTime' || key === 'deliveryTime') {
        displayValue = formatTimestamp(String(value));
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
            <Typography component="span" sx={typographySx}>{displayValue}</Typography>
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
    
    const baseSx: any = { flexGrow: 1, textAlign: 'right', border: '1px solid transparent', padding: '0 4px', display: 'inline-block' }; // Use any for flexibility

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
                  <Typography component="span" sx={baseSx}>{String(value)}</Typography>
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
                            <Typography component="span" sx={baseSx}>{displayValue}</Typography>
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

  const renderFundingRateHistoryDetails = (history: ProcessedFundingHistoryEntry[]) => {
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <FormControlLabel
                control={<Switch checked={showAnnualizedRate} onChange={handleAnnualizedRateToggle} />}
                label=""
                sx={{mr: 0}} />
        </Box>
        <List dense sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
          {history.map((entry, index) => {
            const rateToDisplay = showAnnualizedRate 
                ? entry.numericRate8h * 3 * 365 
                : entry.numericRate8h;
            
            const displayRateString = (rateToDisplay >= 0 ? '+' : '') + rateToDisplay.toFixed(4) + '%';
            const isRateNegativeForDisplay = showAnnualizedRate ? (entry.numericRate8h * 3 * 365 < 0) : entry.isNegative;

            return (
                <ListItem key={index} divider={index < history.length -1 } sx={{ display: 'flex', justifyContent: 'space-between', paddingY: '2px'}}>
                <ListItemText 
                    primary={formatTimestamp(entry.fundingRateTimestamp)} 
                    secondary={`${entry.originalFundingRateFromApi}%`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                    sx={{flex: '1 1 auto', textAlign: 'left'}}
                />
                <Typography 
                    variant="body2" 
                    sx={{
                        flex: '0 0 auto', 
                        textAlign: 'right', 
                        fontWeight: isRateNegativeForDisplay ? 'bold' : 'normal', 
                        color: isRateNegativeForDisplay ? theme.palette.error.main : theme.palette.success.main 
                    }}>
                    {displayRateString}
                </Typography>
                </ListItem>
            );
          })}
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

        {!loading && !error && (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="Ticker Details Tabs" centered>
                <Tab label="Market & Instrument Info" id="tab-market-instrument" aria-controls="tabpanel-market-instrument" />
                {category !== 'spot' && <Tab label="Funding Rate History" id="tab-funding-history" aria-controls="tabpanel-funding-history" />}
              </Tabs>
            </Box>

            {/* Tab Panel for Market & Instrument Info */}
            <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-market-instrument" aria-labelledby="tab-market-instrument">
              {activeTab === 0 && (
                <>
                  {ticker && (
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
                            padding: '4px 8px' // Matched padding from other items
                        }}>
                          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', marginRight:1, textAlign: 'left' }}>Category</Typography>
                          {/* Ensured category value also uses baseSx for consistency */}
                          <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right', border: '1px solid transparent', padding: '0 4px', display: 'inline-block' }}>{decodeURIComponent(category)}</Typography>
                        </Box>
                        {renderTickerDetails(ticker, instrumentInfo?.priceFilter?.tickSize)}
                      </Box>
                    </Box>
                  )}
                  {!ticker && !error && (
                    <Typography sx={{textAlign: 'center', color: 'text.secondary', mt: 3}}>
                        No ticker data available.
                    </Typography>
                  )}

                  {instrumentError && (
                    <Alert severity="warning" sx={{ marginY: 2, mt: (ticker) ? 2 : 0 }}>
                        Could not load instrument details: {instrumentError}
                    </Alert>
                  )}
                  {instrumentInfo && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      {renderInstrumentInfoDetails(instrumentInfo)}
                    </>
                  )}
                  {!instrumentInfo && !instrumentError && ticker && (
                    <Typography sx={{textAlign: 'center', color: 'text.secondary', mt: 3}}>
                        No instrument information available.
                    </Typography>
                  )}
                </>
              )}
            </Box>

            {/* Tab Panel for Funding Rate History */}
            {category !== 'spot' && (
                <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-funding-history" aria-labelledby="tab-funding-history">
                    {activeTab === 1 && (
                        <>
                            {renderFundingRateHistoryDetails(fundingHistory)}
                            {/* Loading/Error specifically for funding history if it hasn't loaded with main data or independently */} 
                            {loadingFundingHistory && !fundingHistoryError && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', mt: 2 }}>
                                    <CircularProgress size={30} />
                                    <Typography sx={{ml: 1}}>Loading Funding History...</Typography>
                                </Box>
                            )}
                            {!loadingFundingHistory && fundingHistoryError && (
                                <Alert severity="warning" sx={{ marginY: 2, mt: 2 }}>Failed to load funding rate history: {fundingHistoryError}</Alert>
                            )}
                        </>
                    )}
                </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}
