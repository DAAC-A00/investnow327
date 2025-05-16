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
  useTheme
} from '@mui/material';
import { BybitTicker } from '@/services/bybit/types';
import { fetchBybitTickers } from '@/services/bybit/api';

const REFRESH_INTERVAL = 1000; // 1 second
const PRICE_EFFECT_DURATION = 200; // 0.2 seconds

interface DisplayTicker extends BybitTicker {
  priceEffect?: 'up' | 'down';
}

interface BybitTickerPageProps {
  category: 'spot' | 'linear' | 'inverse';
  title: string;
}

export default function BybitTickerPageComponent({ category, title }: BybitTickerPageProps) {
  const theme = useTheme(); 
  const [tickers, setTickers] = useState<DisplayTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const prevTickersRef = useRef<Map<string, DisplayTicker>>(new Map());
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const currentTickers = await fetchBybitTickers(category);
      
      const newDisplayTickers = currentTickers.map(currentTicker => {
        const prevTicker = prevTickersRef.current.get(currentTicker.symbol);
        let priceEffect: 'up' | 'down' | undefined = undefined;

        if (prevTicker && prevTicker.lastPrice && currentTicker.lastPrice) {
          const prevPrice = parseFloat(prevTicker.lastPrice);
          const currentPrice = parseFloat(currentTicker.lastPrice);
          if (currentPrice > prevPrice) {
            priceEffect = 'up';
          } else if (currentPrice < prevPrice) {
            priceEffect = 'down';
          }
        }
        return { ...currentTicker, priceEffect };
      });

      setTickers(newDisplayTickers);
      
      const newPrevTickersMap = new Map<string, DisplayTicker>();
      newDisplayTickers.forEach(ticker => {
        newPrevTickersMap.set(ticker.symbol, ticker);
        if (ticker.priceEffect) {
          const existingTimeout = timeoutRef.current.get(ticker.symbol);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }
          const newTimeout = setTimeout(() => {
            setTickers(prev => 
              prev.map(t => 
                t.symbol === ticker.symbol ? { ...t, priceEffect: undefined } : t
              )
            );
            timeoutRef.current.delete(ticker.symbol);
          }, PRICE_EFFECT_DURATION);
          timeoutRef.current.set(ticker.symbol, newTimeout);
        }
      });
      prevTickersRef.current = newPrevTickersMap;

      setError(null);
    } catch (err: any) {
      console.error(`Error fetching ${category} tickers:`, err.message);
      if (isInitialLoad) {
        setError(err.message || 'An unknown error occurred');
      }
    }
    if (isInitialLoad) setLoading(false);
  }, [category]); 

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
    setSearchTerm(event.target.value.toUpperCase());
  };

  const filteredTickers = useMemo(() => {
    if (!searchTerm) return tickers;
    return tickers.filter(ticker => ticker.symbol.toUpperCase().includes(searchTerm));
  }, [tickers, searchTerm]);

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
                {error} (Data might be stale if refresh fails)
            </Alert>
        )}

        <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'center' }}>
          <TextField
            label={`Search Symbol (e.g., ${category === 'inverse' ? 'BTCUSD' : 'BTCUSDT'})`}
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ minWidth: {xs: '100%', sm: 300, md: 400} }}
          />
        </Box>

        {filteredTickers.length === 0 && !loading && (
             <Typography sx={{textAlign: 'center', color: 'text.secondary', mt: 3}}>
                {tickers.length > 0 ? 'No tickers found for your search.' : 'No tickers available or failed to load initially.'}
            </Typography>
        )}

        {filteredTickers.length > 0 && (
          <List sx={{ maxHeight: 600, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 0, p:0 }}>
            {filteredTickers.map((ticker, index) => {
              const storedPercentageStr = ticker.price24hPcnt;
              const numericPercentage = parseFloat(storedPercentageStr);
              
              let priceChangeTextColor = 'text.secondary';
              if (numericPercentage > 0) priceChangeTextColor = 'success.main';
              else if (numericPercentage < 0) priceChangeTextColor = 'error.main';

              const displayPercentText = `${storedPercentageStr}%`;
              
              const valueDisplayBaseSx = {
                display: 'inline-block',
                padding: '2px 4px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderRadius: 0, 
              };
              
              const lastPriceValueSx = {
                ...valueDisplayBaseSx,
                transition: 'border-color 0.1s ease-in-out',
                borderColor: ticker.priceEffect === 'up' 
                              ? theme.palette.success.main 
                              : ticker.priceEffect === 'down' 
                                ? theme.palette.error.main 
                                : valueDisplayBaseSx.borderColor, // 기본값 (transparent)
              };
              
              const changeValueSx = {
                ...valueDisplayBaseSx,
                color: priceChangeTextColor,
              };

              const dataItemContainerSx = (flexBasisMd = 'calc(20.83% - 8px)') => ({
                flexBasis: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: flexBasisMd }, 
                width: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: flexBasisMd }
              });

              return (
                <React.Fragment key={ticker.symbol}>
                  <ListItem sx={{py: 1.5}}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        width: '100%',
                        gap: 1,
                      }}
                    >
                      {/* Symbol */}
                      <Box sx={{ ...dataItemContainerSx('calc(16.66% - 8px)'), pr:1 }}>
                          <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>{ticker.symbol}</Typography>
                      </Box>
                      
                      {/* Last Price */}
                      <Box sx={dataItemContainerSx()}> 
                          <ListItemText 
                            primaryTypographyProps={{variant:'caption', color:'text.secondary'}}
                            primary="Last Price" 
                            secondary={
                              <Box component="span" sx={lastPriceValueSx}>
                                {ticker.lastPrice || 'N/A'}
                              </Box>
                            }
                          />
                      </Box>

                      {/* 24h Change */}
                      <Box sx={dataItemContainerSx()}>
                          <ListItemText 
                            primaryTypographyProps={{variant:'caption', color:'text.secondary'}}
                            primary="24h Change" 
                            secondary={
                              <Box component="span" sx={changeValueSx}>
                                  {displayPercentText}
                              </Box>
                            }
                          />
                      </Box>

                      {/* 24h Volume */}
                      <Box sx={dataItemContainerSx()}>
                          <ListItemText 
                            primaryTypographyProps={{variant:'caption', color:'text.secondary'}}
                            primary="24h Volume" 
                            secondary={
                              <Box component="span" sx={valueDisplayBaseSx}>
                                  {ticker.volume24h || 'N/A'}
                              </Box>
                            }
                          />
                      </Box>

                      {/* 24h Turnover */}
                       <Box sx={dataItemContainerSx('calc(20.83% - 8px)')}>
                          <ListItemText 
                            primaryTypographyProps={{variant:'caption', color:'text.secondary'}}
                            primary="24h Turnover" 
                            secondary={
                              <Box component="span" sx={valueDisplayBaseSx}>
                                  {ticker.turnover24h || 'N/A'}
                              </Box>
                            }
                          />
                      </Box>
                    </Box>
                  </ListItem>
                  {index < filteredTickers.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
}
