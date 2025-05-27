'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  TextField,
  Box,
  Divider,
  useTheme,
  IconButton,
  Button,
  Drawer,
  ListItemButton,
  Chip
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort';
import { BithumbTicker } from '@/services/bithumb/types';
import { fetchBithumbTickers, BithumbTickersResponse } from '@/services/bithumb/api';

const REFRESH_INTERVAL = 3000; // 3 seconds for Bithumb API
const PRICE_EFFECT_DURATION = 200;

interface DisplayTicker extends BithumbTicker {
  priceEffect?: 'up' | 'down' | 'flat';
}

interface BithumbTickerPageProps {
  title: string;
}

type SortableField = keyof Pick<BithumbTicker, 'symbol' | 'lastPrice' | 'priceChangePercent24h' | 'volume24h' | 'value24h'> | 'none';
type SortDirection = 'asc' | 'desc';

const sortableFieldsOptions: { value: SortableField; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'symbol', label: 'Symbol' },
  { value: 'lastPrice', label: 'Last Price' },
  { value: 'priceChangePercent24h', label: '24h Change %' },
  { value: 'volume24h', label: 'Volume 24h' },
  { value: 'value24h', label: 'Value 24h' },
];

const formatNumberWithCommas = (value: string | number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  const numStr = String(value);
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const formatVolumeOrValue = (value: string | number | undefined): string => {
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
    return formatNumberWithCommas(num.toFixed(2));
  }
};

export default function BithumbTickerPageComponent({ title }: BithumbTickerPageProps) {
  const theme = useTheme();
  const [tickers, setTickers] = useState<DisplayTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'KRW' | 'USDT' | 'BTC'>('ALL');
  // Define market type for better type safety
  type MarketType = 'KRW' | 'USDT' | 'BTC';
  const MARKETS: MarketType[] = ['KRW', 'USDT', 'BTC'];
  
  const [marketStatus, setMarketStatus] = useState<Record<MarketType, boolean>>({KRW: true, USDT: true, BTC: true});
  const [sortField, setSortField] = useState<SortableField>('value24h');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const prevTickersRef = useRef<Map<string, DisplayTicker>>(new Map());
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const response = await fetchBithumbTickers();
      const { tickers: currentTickers, marketStatus: marketStatusUpdate, errorMessages } = response;
      
      setMarketStatus(marketStatusUpdate);
      setApiErrors(errorMessages || {});
      
      const newDisplayTickers = currentTickers.map(currentTicker => {
        const tickerId = `${currentTicker.symbol}_${currentTicker.market}`;
        const prevTicker = prevTickersRef.current.get(tickerId);
        let priceEffect: 'up' | 'down' | 'flat' | undefined = undefined;
        
        if (prevTicker && prevTicker.lastPrice && currentTicker.lastPrice) {
          const prevPriceNum = parseFloat(prevTicker.lastPrice);
          const currentPriceNum = parseFloat(currentTicker.lastPrice);
          if (currentPriceNum > prevPriceNum) priceEffect = 'up';
          else if (currentPriceNum < prevPriceNum) priceEffect = 'down';
          else priceEffect = 'flat';
        }
        
        return { ...currentTicker, priceEffect };
      });
      
      setTickers(newDisplayTickers);
      
      const newPrevTickersMap = new Map<string, DisplayTicker>();
      newDisplayTickers.forEach(ticker => {
        const tickerId = `${ticker.symbol}_${ticker.market}`;
        newPrevTickersMap.set(tickerId, ticker);
        
        if (ticker.priceEffect === 'up' || ticker.priceEffect === 'down') {
          const existingTimeout = timeoutRef.current.get(tickerId);
          if (existingTimeout) clearTimeout(existingTimeout);
          
          const newTimeout = setTimeout(() => {
            setTickers(prev => prev.map(t => {
              if (`${t.symbol}_${t.market}` === tickerId) {
                return { ...t, priceEffect: 'flat' };
              }
              return t;
            }));
            timeoutRef.current.delete(tickerId);
          }, PRICE_EFFECT_DURATION);
          
          timeoutRef.current.set(tickerId, newTimeout);
        }
      });
      
      prevTickersRef.current = newPrevTickersMap;
      setError(null);
    } catch (err: any) {
      console.error('Error fetching Bithumb tickers:', err.message);
      if (isInitialLoad) setError(err.message || 'An unknown error occurred');
    }
    
    if (isInitialLoad) setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    
    return () => {
      clearInterval(intervalId);
      timeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRef.current.clear();
    };
  }, [fetchData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleMarketSelect = (market: 'ALL' | MarketType) => {
    setSelectedMarket(market);
  };

  const handleSortDirectionToggle = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleOpenBottomSheet = () => setIsBottomSheetOpen(true);
  const handleCloseBottomSheet = () => setIsBottomSheetOpen(false);

  const handleSortFieldSelect = (field: SortableField) => {
    setSortField(field);
    handleCloseBottomSheet();
  };

  const processedTickers = useMemo(() => {
    let tickersToProcess = [...tickers];
    
    // Filter by market
    if (selectedMarket !== 'ALL') {
      tickersToProcess = tickersToProcess.filter(ticker => ticker.market === selectedMarket);
    }
    
    // Filter by search term
    if (searchTerm) {
      const upperSearchTerm = searchTerm.toUpperCase();
      tickersToProcess = tickersToProcess.filter(ticker => {
        // Search by searchKey (baseCode+quoteCode+baseCode format)
        if (ticker.searchKey.toUpperCase().includes(upperSearchTerm)) {
          return true;
        }
        // Also allow searching by pair or symbol as fallback
        return ticker.pair.toUpperCase().includes(upperSearchTerm) || 
               ticker.symbol.toUpperCase().includes(upperSearchTerm);
      });
    }
    
    // Sort by selected field
    if (sortField !== 'none') {
      tickersToProcess.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        
        if (valA === null || valA === undefined) return sortDirection === 'asc' ? -1 : 1;
        if (valB === null || valB === undefined) return sortDirection === 'asc' ? 1 : -1;
        
        let comparison = 0;
        const numA = parseFloat(valA.toString());
        const numB = parseFloat(valB.toString());
        
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = valA.toString().localeCompare(valB.toString());
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return tickersToProcess;
  }, [tickers, searchTerm, sortField, sortDirection, selectedMarket]);

  if (loading && tickers.length === 0) {
    return <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}><CircularProgress size={60} /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2, borderRadius: 0 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {title}
        </Typography>

        {error && (
          <Alert severity="warning" sx={{marginY: 2}}>
            {error.includes('Bithumb API error:') ? (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Bithumb API Error:
                </Typography>
                {error.split('\n').map((line, index) => (
                  <Typography key={index} variant="body2" component="div">
                    {line.replace('Bithumb API error: ', '')}
                  </Typography>
                ))}
              </>
            ) : (
              <>{error} (Data might be stale if refresh fails)</>
            )}
          </Alert>
        )}

        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          marginBottom: 3, 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Box sx={{ position: 'relative', flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' }, width: {sm: 'calc(60% - 8px)', md: 'auto'} }}>
            <TextField
              fullWidth
              label="Search (e.g., BTC, BTC/KRW, BTCKRWBTC)"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </Box>
          
          <Box sx={{ minWidth: { xs: 'auto', sm: 'auto' }, display:'flex', alignItems:'center' }}> 
            <Button 
              variant="outlined" 
              onClick={handleOpenBottomSheet}
              startIcon={<SortIcon />}
              sx={{ height: 56 }}
            >
              Sort By: {sortableFieldsOptions.find(opt => opt.value === sortField)?.label || 'None'}
            </Button>
          </Box>
          
          <Box sx={{ minWidth: { xs: 'auto', sm: 'auto' }, display:'flex', alignItems:'center' }}> 
            <IconButton 
              onClick={handleSortDirectionToggle} 
              disabled={sortField === 'none'}
              color="primary"
              aria-label={sortDirection === 'asc' ? "Sort Ascending" : "Sort Descending"}
            >
              {sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            key="ALL"
            label="ALL"
            onClick={() => handleMarketSelect('ALL')}
            color={selectedMarket === 'ALL' ? 'primary' : 'default'}
            variant={selectedMarket === 'ALL' ? 'filled' : 'outlined'}
          />
          {/* Sort markets to show available ones first */}
          {/* Sort markets to show available ones first */}
          {[...MARKETS]
            .sort((a: MarketType, b: MarketType) => {
              // Sort by availability (available first)
              if (marketStatus[a] && !marketStatus[b]) return -1;
              if (!marketStatus[a] && marketStatus[b]) return 1;
              // If both have same availability, keep original order
              return 0;
            })
            .map((market) => (
              <Chip 
                key={market}
                label={`${marketStatus[market] ? '🟢' : '🔴'} ${market}`}
                onClick={() => handleMarketSelect(market)}
                color={selectedMarket === market ? 'primary' : 'default'}
                variant={selectedMarket === market ? 'filled' : 'outlined'}
                sx={{
                  opacity: marketStatus[market] ? 1 : 0.7,
                }}
              />
            ))}

        </Box>

        <Drawer anchor="bottom" open={isBottomSheetOpen} onClose={handleCloseBottomSheet}>
          <Box sx={{ padding: 2 }}>
            <Typography variant="h6" gutterBottom component="div" sx={{textAlign: 'center'}}>Sort By</Typography>
            <List>
              {sortableFieldsOptions.map(option => (
                <ListItemButton 
                  key={option.value} 
                  selected={sortField === option.value}
                  onClick={() => handleSortFieldSelect(option.value)}
                >
                  <ListItemText primary={option.label} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Drawer>

        {!loading && processedTickers.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {error || 'No tickers found. Try adjusting your search or market filter.'}
            </Typography>
            {Object.keys(apiErrors).length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  API Errors:
                </Typography>
                {Object.entries(apiErrors).map(([market, message]) => (
                  <Typography key={market} variant="body2" color="text.secondary">
                    Bithumb Notice: {message}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}

        {processedTickers.length > 0 && (
          <List sx={{ flex: 1, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 0, p:0 }}>
            {processedTickers.map((ticker, index) => {
              const numericChangePercent = parseFloat(ticker.priceChangePercent24h);
              
              let sharedTextColor = theme.palette.grey[700];
              if (numericChangePercent > 0) sharedTextColor = theme.palette.success.main;
              else if (numericChangePercent < 0) sharedTextColor = theme.palette.error.main;

              const valueDisplayBaseSx = {
                display: 'inline-block', 
                padding: '2px 4px', 
                borderWidth: '1px', 
                borderStyle: 'solid',
                borderColor: 'transparent', 
                borderRadius: 0, 
                transition: 'color 0.1s ease-in-out',
              };
              
              const lastPriceValueSx = {
                ...valueDisplayBaseSx, 
                transition: 'border-color 0.1s ease-in-out, color 0.1s ease-in-out',
                borderColor: ticker.priceEffect === 'up' ? theme.palette.success.main : 
                             ticker.priceEffect === 'down' ? theme.palette.error.main : 
                             valueDisplayBaseSx.borderColor,
                color: sharedTextColor,
              };
              
              const changeValueSx = { ...valueDisplayBaseSx, color: sharedTextColor };
              
              // Define flex basis for responsive layout
              const dataItemContainerSx = (isSymbol = false) => ({
                flexBasis: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: isSymbol ? 'calc(20% - 8px)' : 'calc(20% - 8px)' },
                width: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: isSymbol ? 'calc(20% - 8px)' : 'calc(20% - 8px)' },
              });

              return (
                <React.Fragment key={`${ticker.symbol}_${ticker.market}`}>
                  <ListItem 
                    sx={{ py: 1.5, '&:hover': { backgroundColor: theme.palette.action.hover }, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', width: '100%', gap: 1 }}>
                      <Box sx={{ ...dataItemContainerSx(true), pr:1 }}>
                        <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>{ticker.pair}</Typography>
                        <Chip 
                          label={ticker.market} 
                          size="small" 
                          color={
                            ticker.market === 'KRW' ? 'primary' : 
                            ticker.market === 'USDT' ? 'success' : 
                            'secondary'
                          }
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      <Box sx={dataItemContainerSx()}> 
                        <ListItemText 
                          primaryTypographyProps={{variant:'caption', color:'text.secondary'}} 
                          primary="Last Price" 
                          secondary={
                            <Box component="span" sx={lastPriceValueSx}>
                              {formatNumberWithCommas(ticker.lastPrice)}
                            </Box>
                          } 
                        />
                      </Box>
                      <Box sx={dataItemContainerSx()}>
                        <ListItemText 
                          primaryTypographyProps={{variant:'caption', color:'text.secondary'}} 
                          primary="24h Change" 
                          secondary={
                            <Box component="span" sx={changeValueSx}>
                              {ticker.priceChangePercent24h}%
                            </Box>
                          } 
                        />
                      </Box>
                      <Box sx={dataItemContainerSx()}>
                        <ListItemText 
                          primaryTypographyProps={{variant:'caption', color:'text.secondary'}} 
                          primary="Volume 24h" 
                          secondary={
                            <Box component="span" sx={valueDisplayBaseSx}>
                              {formatVolumeOrValue(ticker.volume24h)}
                            </Box>
                          } 
                        />
                      </Box>
                      <Box sx={dataItemContainerSx()}>
                        <ListItemText 
                          primaryTypographyProps={{variant:'caption', color:'text.secondary'}} 
                          primary="Value 24h" 
                          secondary={
                            <Box component="span" sx={valueDisplayBaseSx}>
                              {formatVolumeOrValue(ticker.value24h)}
                            </Box>
                          } 
                        />
                      </Box>
                    </Box>
                  </ListItem>
                  {index < processedTickers.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
}
