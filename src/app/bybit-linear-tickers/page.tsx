'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
} from '@mui/material';

interface BybitTicker {
  symbol: string;
  lastPrice: string;
  bid1Price: string;
  ask1Price: string;
  price24hPcnt: string; // Stores formatted percentage string with sign e.g. "+5.23", "-2.10", "+0.00"
  volume24h: string;
  turnover24h: string;
  usdIndexPrice?: string;
}

interface BybitApiResponseTicker {
  symbol: string;
  lastPrice: string;
  bid1Price: string;
  ask1Price: string;
  price24hPcnt: string; // Original string from API e.g. "0.0523", "-0.0210", "0.0000"
  volume24h: string;
  turnover24h: string;
  usdIndexPrice?: string;
}

interface BybitApiResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: BybitApiResponseTicker[];
  };
  retExtInfo: any;
  time: number;
}

const API_ENDPOINT = 'https://api.bybit.com/v5/market/tickers?category=linear'; // Changed to linear
const REFRESH_INTERVAL = 1000; // 1 second

export default function BybitLinearTickersPage() { // Renamed function
  const [tickers, setTickers] = useState<BybitTicker[]>([]);
  const [loading, setLoading] = useState(true); // For initial load
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTickers = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    try {
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.retMsg || 'Failed to fetch Bybit tickers');
      }
      const data: BybitApiResponse = await response.json();
      if (data.retCode === 0 && data.result && data.result.list) {
        const processedTickers: BybitTicker[] = data.result.list.map(apiTicker => {
          const pChangeFactor = parseFloat(apiTicker.price24hPcnt);
          let storedPercentageString = "0.00"; // Default if parsing fails

          if (!isNaN(pChangeFactor)) {
            const actualPercentage = pChangeFactor * 100;
            if (actualPercentage >= 0) {
              storedPercentageString = `+${actualPercentage.toFixed(2)}`;
            } else {
              storedPercentageString = actualPercentage.toFixed(2);
            }
          } else {
            if (apiTicker.price24hPcnt && !apiTicker.price24hPcnt.startsWith('-') && !apiTicker.price24hPcnt.startsWith('+')){
                storedPercentageString = `+${apiTicker.price24hPcnt}`;
            } else {
                storedPercentageString = apiTicker.price24hPcnt || "+0.00"; 
            }
          }

          return {
            ...apiTicker,
            price24hPcnt: storedPercentageString,
          };
        });
        const sortedTickers = processedTickers.sort((a, b) => parseFloat(b.turnover24h) - parseFloat(a.turnover24h));
        setTickers(sortedTickers);
        setError(null);
      } else {
        throw new Error(data.retMsg || 'Invalid API response structure');
      }
    } catch (err: any) {
      console.error("Fetch error:", err.message);
      setError(err.message || 'An unknown error occurred during data refresh');
    }
    if (isInitialLoad) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers(true);
    const intervalId = setInterval(() => {
      fetchTickers(false);
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchTickers]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toUpperCase());
  };

  const filteredTickers = useMemo(() => {
    if (!searchTerm) {
      return tickers;
    }
    return tickers.filter(ticker =>
      ticker.symbol.toUpperCase().includes(searchTerm)
    );
  }, [tickers, searchTerm]);

  if (loading) {
    return <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}><CircularProgress size={60} /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Bybit Linear Market Tickers (Live & Sorted by Turnover) {/* Changed title */}
        </Typography>

        {error && (
            <Alert severity="warning" sx={{marginY: 2}}>
                {error} (Data might be stale)
            </Alert>
        )}

        <Box sx={{ marginBottom: 3, display: 'flex', justifyContent: 'center' }}>
          <TextField
            label="Search Symbol (e.g., BTCUSDT)"
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
          <List sx={{ maxHeight: 600, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p:0 }}>
            {filteredTickers.map((ticker, index) => {
              const storedPercentageStr = ticker.price24hPcnt; 
              const numericPercentage = parseFloat(storedPercentageStr);
              
              let displayColor = 'text.secondary'; 
              if (numericPercentage > 0) {
                displayColor = 'success.main';
              } else if (numericPercentage < 0) {
                displayColor = 'error.main';
              }

              const displayText = `${storedPercentageStr}%`;

              return (
                <React.Fragment key={ticker.symbol}>
                  <ListItem>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        width: '100%',
                        gap: 1,
                      }}
                    >
                      <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(25% - 8px)', md: 'calc(16.66% - 8px)' }, width: { xs: '100%', sm: 'calc(25% - 8px)', md: 'calc(16.66% - 8px)'} }}>
                          <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>{ticker.symbol}</Typography>
                      </Box>
                      <Box sx={{ flexBasis: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: 'calc(20.83% - 8px)' }, width: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: 'calc(20.83% - 8px)'} }}>
                          <ListItemText primary="Last Price" secondary={ticker.lastPrice || 'N/A'} />
                      </Box>
                      <Box sx={{ flexBasis: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: 'calc(20.83% - 8px)' }, width: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: 'calc(20.83% - 8px)'} }}>
                          <ListItemText primary="24h Change" 
                              secondary={displayText}
                              secondaryTypographyProps={{ color: displayColor}}
                          />
                      </Box>
                      <Box sx={{ flexBasis: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: 'calc(20.83% - 8px)' }, width: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: 'calc(20.83% - 8px)'} }}>
                          <ListItemText primary="24h Volume" secondary={ticker.volume24h || 'N/A'} />
                      </Box>
                       <Box sx={{ flexBasis: { xs: 'calc(50% - 4px)', sm: '100%', md: 'calc(20.83% - 8px)' }, width: { xs: 'calc(50% - 4px)', sm: '100%', md: 'calc(20.83% - 8px)'} }}>
                          <ListItemText primary="24h Turnover" secondary={ticker.turnover24h || 'N/A'} />
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
