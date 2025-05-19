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
import { BybitTicker } from '@/services/bybit/types';
import { fetchBybitTickers } from '@/services/bybit/api';
import { TickerCategory } from '@/stores/sortStore';
import { useNavigationStore } from '@/stores/navigationStore';

interface DisplayTicker extends BybitTicker {
  priceEffect?: 'up' | 'down' | 'flat';
}

const formatNumberWithCommas = (value: string | number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  const numStr = String(value);
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
       formattedValue = num.toFixed(4); // More precision for small numbers
    }
     const parts = formattedValue.split('.');
     parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
     return parts.join('.');
  }
};

const REFRESH_INTERVAL = 1000; // 1 second
const PRICE_EFFECT_DURATION = 200; // duration for price change effect

interface TickerDetailPageProps {
  params: {
    category: TickerCategory;
    symbol: string;
  };
}

export default function TickerDetailPage({ params }: TickerDetailPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const { setAppbarTitle, setLeftButtonAction, setShowMenuButton } = useNavigationStore();
  const { category, symbol } = params;
  const [ticker, setTicker] = useState<DisplayTicker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prevTickerRef = useRef<BybitTicker | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchAndSetTicker = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
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
      setError(err.message || 'An unknown error occurred');
    } finally {
        setLoading(false);
    }
  }, [category, symbol]);

  useEffect(() => {
    if (category && symbol) {
        // Set Appbar title and left button action when component mounts
        setAppbarTitle(decodeURIComponent(symbol));
        setLeftButtonAction(() => router.back()); // Set back button action
        setShowMenuButton(false); // Hide menu button

        fetchAndSetTicker(); // Initial fetch and start interval
        intervalRef.current = setInterval(fetchAndSetTicker, REFRESH_INTERVAL);
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

       // Reset Appbar title and left button when component unmounts
       setAppbarTitle('Tickers'); // Or your default title
       setLeftButtonAction(null); // Reset left button action
       setShowMenuButton(true); // Show menu button
    };

  }, [category, symbol, fetchAndSetTicker, setAppbarTitle, setLeftButtonAction, setShowMenuButton, router]);

  const renderTickerDetails = (ticker: DisplayTicker) => {
    const orderedKeys: (keyof BybitTicker)[] = [
        'symbol',
        'lastPrice',
        'bid1Price',
        'ask1Price',
        'price24hPcnt',
        'volume24h',
        'turnover24h',
        'usdIndexPrice',
    ];

    return orderedKeys
        .filter(key => ticker[key] !== undefined && ticker[key] !== null)
        .map((key) => {
      const value = ticker[key];
      let displayValue = value;
      // Right align value and allow it to grow
      let valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{String(displayValue)}</Typography>;

      // Apply specific formatting and styling based on key
      if (key === 'lastPrice') {
        displayValue = formatNumberWithCommas(value);
         // Apply border directly to the value Typography
         const lastPriceValueSx = {
            // Removed flexGrow
             textAlign: 'right',
             border: ticker.priceEffect === 'up' ? `1px solid ${theme.palette.success.main}` : ticker.priceEffect === 'down' ? `1px solid ${theme.palette.error.main}` : '1px solid transparent',
             padding: '0 4px',
             display: 'inline-block', // Make it inline-block to wrap content
         };
         valueTypography = <Typography component="span" sx={lastPriceValueSx}>{displayValue}</Typography>;

      } else if (key === 'bid1Price' || key === 'ask1Price' || key === 'usdIndexPrice') {
        displayValue = formatNumberWithCommas(value);
         valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
      } else if (key === 'volume24h' || key === 'turnover24h') {
         displayValue = formatVolumeOrTurnover(value);
         valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
      } else if (key === 'price24hPcnt') {
         const numericChange = parseFloat(String(value));
         let color = 'text.primary';
         if (!isNaN(numericChange)) {
            if (numericChange > 0) color = 'success.main';
            else if (numericChange < 0) color = 'error.main';
            displayValue = `${formatNumberWithCommas(value)}%`;
            valueTypography = <Typography component="span" sx={{ color: color, flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
         } else {
             displayValue = 'N/A';
             valueTypography = <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{displayValue}</Typography>;
         }
      }

      return (
        <Box key={key} sx={{
            marginBottom: 1,
            width: { xs: '100%', sm: 'calc(50% - 8px)' },
            marginRight: { xs: 0, sm: key === 'usdIndexPrice' ? 0 : '16px' },
            wordBreak: 'break-word',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0' // Adjust padding since border is on valueTypography
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
        {/* Removed local back button and title box - Appbar handles title and back */}
        {/* Show symbol as a prominent header within the content - keep if needed for visual hierarchy below Appbar */}
        {/* <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ marginBottom: 2 }}>
             {decodeURIComponent(symbol)}
             {loading && ticker && <CircularProgress size={20} sx={{ marginLeft: 1, verticalAlign: 'middle' }} />}
        </Typography> */}

        {/* Show loading spinner only if no ticker data is available yet */}
        {loading && !ticker && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ marginY: 2 }}>
            {error}
          </Alert>
        )}

        {/* Show ticker data if available, regardless of loading state */}
        {ticker && (
          <Box sx={{ marginTop: 2 }}>
            {/* Category is now a detail item */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
                {/* Render category as part of details or keep separate - Kept separate for now but styled like other detail items */}
                 <Box sx={{
                    marginBottom: 1, 
                    wordBreak: 'break-word', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                     width: { xs: '100%', sm: 'calc(50% - 8px)' },
                     marginRight: { xs: 0, sm: '16px' },
                      padding: '4px 8px' // Add padding for consistent look with bordered lastPrice
                }}>
                    <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold', marginRight: 1, textAlign: 'left' }}>Category:</Typography>
                     <Typography component="span" sx={{ flexGrow: 1, textAlign: 'right' }}>{decodeURIComponent(category)}</Typography>
                </Box>
                {renderTickerDetails(ticker)}
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
