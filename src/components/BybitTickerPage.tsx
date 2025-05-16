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
import { BybitTicker } from '@/services/bybit/types';
import { fetchBybitTickers } from '@/services/bybit/api';

const REFRESH_INTERVAL = 1000; // 1 second

interface BybitTickerPageProps {
  category: 'spot' | 'linear' | 'inverse';
  title: string;
}

export default function BybitTickerPageComponent({ category, title }: BybitTickerPageProps) {
  const [tickers, setTickers] = useState<BybitTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const data = await fetchBybitTickers(category);
      setTickers(data);
      setError(null);
    } catch (err: any) {
      console.error(`Error fetching ${category} tickers:`, err.message);
      setError(err.message || 'An unknown error occurred');
    }
    if (isInitialLoad) setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchData(true);
    const intervalId = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toUpperCase());
  };

  const filteredTickers = useMemo(() => {
    if (!searchTerm) return tickers;
    return tickers.filter(ticker => ticker.symbol.toUpperCase().includes(searchTerm));
  }, [tickers, searchTerm]);

  if (loading) {
    return <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}><CircularProgress size={60} /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {title}
        </Typography>

        {error && (
            <Alert severity="warning" sx={{marginY: 2}}>
                {error} (Data might be stale)
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
          <List sx={{ maxHeight: 600, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p:0 }}>
            {filteredTickers.map((ticker, index) => {
              const storedPercentageStr = ticker.price24hPcnt;
              const numericPercentage = parseFloat(storedPercentageStr);
              
              let displayColor = 'text.secondary';
              if (numericPercentage > 0) displayColor = 'success.main';
              else if (numericPercentage < 0) displayColor = 'error.main';

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
