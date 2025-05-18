'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  Button, // Added Button
  Drawer, // Added Drawer
  ListItemButton // Added ListItemButton
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort'; // Added SortIcon
import { BybitTicker } from '@/services/bybit/types';
import { fetchBybitTickers } from '@/services/bybit/api';
import { useSearchStore } from '@/stores/searchStore';
import { useSortStore, SortableField, SortDirection, TickerCategory } from '@/stores/sortStore';

const REFRESH_INTERVAL = 1000; // 1 second
const PRICE_EFFECT_DURATION = 200; // 0.2 seconds

interface DisplayTicker extends BybitTicker {
  priceEffect?: 'up' | 'down' | 'flat';
}

interface BybitTickerPageProps {
  category: TickerCategory;
  title: string;
}

const sortableFieldsOptions: { value: SortableField; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'symbol', label: 'Symbol' },
  { value: 'lastPrice', label: 'Last Price' },
  { value: 'price24hPcnt', label: '24h Change %' },
  { value: 'volume24h', label: '24h Volume' },
  { value: 'turnover24h', label: '24h Turnover' },
];

export default function BybitTickerPageComponent({ category, title }: BybitTickerPageProps) {
  const theme = useTheme();
  const [tickers, setTickers] = useState<DisplayTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false); // State for BottomSheet

  const searchTerm = useSearchStore((state) => state.searchTerms[category]);
  const setSearchTermForCategory = useSearchStore((state) => state.setSearchTerm);

  const { field: sortField, direction: sortDirection } = useSortStore((state) => state.sortCriteria[category]);
  const setSortCriteriaForCategory = useSortStore((state) => state.setSortCriteria);

  const prevTickersRef = useRef<Map<string, DisplayTicker>>(new Map());
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const currentTickers = await fetchBybitTickers(category);
      const newDisplayTickers = currentTickers.map(currentTicker => {
        const prevTicker = prevTickersRef.current.get(currentTicker.symbol);
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
        newPrevTickersMap.set(ticker.symbol, ticker);
        if (ticker.priceEffect === 'up' || ticker.priceEffect === 'down') {
          const existingTimeout = timeoutRef.current.get(ticker.symbol);
          if (existingTimeout) clearTimeout(existingTimeout);
          const newTimeout = setTimeout(() => {
            setTickers(prev => prev.map(t => t.symbol === ticker.symbol ? { ...t, priceEffect: 'flat' } : t));
            timeoutRef.current.delete(ticker.symbol);
          }, PRICE_EFFECT_DURATION);
          timeoutRef.current.set(ticker.symbol, newTimeout);
        }
      });
      prevTickersRef.current = newPrevTickersMap;
      setError(null);
    } catch (err: any) {
      console.error(`Error fetching ${category} tickers:`, err.message);
      if (isInitialLoad) setError(err.message || 'An unknown error occurred');
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
    setSearchTermForCategory(category, event.target.value.toUpperCase());
  };

  const handleSortDirectionToggle = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortCriteriaForCategory(category, sortField, newDirection);
  };

  const handleOpenBottomSheet = () => setIsBottomSheetOpen(true);
  const handleCloseBottomSheet = () => setIsBottomSheetOpen(false);

  const handleSortFieldSelect = (field: SortableField) => {
    setSortCriteriaForCategory(category, field, sortDirection);
    handleCloseBottomSheet();
  };

  const processedTickers = useMemo(() => {
    let TickersToProcess = [...tickers];

    const currentSearchTerm = searchTerm || '';
    if (currentSearchTerm) {
        TickersToProcess = TickersToProcess.filter(ticker => 
        ticker.symbol.toUpperCase().includes(currentSearchTerm)
      );
    }

    if (sortField !== 'none' && sortField) {
        TickersToProcess.sort((a, b) => {
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
    return TickersToProcess;
  }, [tickers, searchTerm, sortField, sortDirection]);

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

        <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2, 
            marginBottom: 3, 
            alignItems: 'center', 
            justifyContent: 'center' 
        }}>
            <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' }, width: {sm: 'calc(60% - 8px)', md: 'auto'} }}>
                <TextField
                    fullWidth
                    label={`Search Symbol (e.g., ${category === 'inverse' ? 'BTCUSD' : 'BTCUSDT'})`}
                    variant="outlined"
                    value={searchTerm || ''}
                    onChange={handleSearchChange}
                />
            </Box>
            <Box sx={{ minWidth: { xs: 'auto', sm: 'auto' }, display:'flex', alignItems:'center' }}>
                <Button 
                    variant="outlined" 
                    onClick={handleOpenBottomSheet} 
                    startIcon={<SortIcon />} 
                    sx={{textTransform: 'none'}}
                >
                    Sort By: {sortableFieldsOptions.find(opt => opt.value === (sortField || 'none'))?.label || 'None'}
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

        {processedTickers.length === 0 && !loading && (
             <Typography sx={{textAlign: 'center', color: 'text.secondary', mt: 3}}>
                {tickers.length > 0 ? 'No tickers found for your search or sort criteria.' : 'No tickers available or failed to load initially.'}
            </Typography>
        )}

        {processedTickers.length > 0 && (
          <List sx={{ maxHeight: 600, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 0, p:0 }}>
            {processedTickers.map((ticker, index) => {
              const displayPercentText = `${ticker.price24hPcnt}%`;
              const numeric24hChange = parseFloat(ticker.price24hPcnt);

              let sharedTextColor = theme.palette.grey[700];
              if (numeric24hChange > 0) sharedTextColor = theme.palette.success.main;
              else if (numeric24hChange < 0) sharedTextColor = theme.palette.error.main;

              const valueDisplayBaseSx = {
                display: 'inline-block', padding: '2px 4px', borderWidth: '1px', borderStyle: 'solid',
                borderColor: 'transparent', borderRadius: 0, transition: 'color 0.1s ease-in-out',
              };
              const lastPriceValueSx = {
                ...valueDisplayBaseSx, transition: 'border-color 0.1s ease-in-out, color 0.1s ease-in-out',
                borderColor: ticker.priceEffect === 'up' ? theme.palette.success.main : ticker.priceEffect === 'down' ? theme.palette.error.main : valueDisplayBaseSx.borderColor,
                color: sharedTextColor,
              };
              const changeValueSx = { ...valueDisplayBaseSx, color: sharedTextColor };
              const dataItemContainerSx = (flexBasisMd = 'calc(20.83% - 8px)') => ({
                flexBasis: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: flexBasisMd }, 
                width: { xs: 'calc(50% - 4px)', sm: 'calc(25% - 8px)', md: flexBasisMd }
              });

              return (
                <React.Fragment key={ticker.symbol}>
                  <ListItem 
                    component={Link} 
                    href={`/bybit-tickers/${category}/${ticker.symbol}`}
                    sx={{ py: 1.5, '&:hover': { backgroundColor: theme.palette.action.hover }, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', width: '100%', gap: 1 }}>
                      <Box sx={{ ...dataItemContainerSx('calc(16.66% - 8px)'), pr:1 }}>
                          <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>{ticker.symbol}</Typography>
                      </Box>
                      <Box sx={dataItemContainerSx()}> 
                          <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="Last Price" secondary={<Box component="span" sx={lastPriceValueSx}>{ticker.lastPrice || 'N/A'}</Box>} />
                      </Box>
                      <Box sx={dataItemContainerSx()}>
                          <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="24h Change" secondary={<Box component="span" sx={changeValueSx}>{displayPercentText}</Box>} />
                      </Box>
                      <Box sx={dataItemContainerSx()}>
                          <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="24h Volume" secondary={<Box component="span" sx={valueDisplayBaseSx}>{ticker.volume24h || 'N/A'}</Box>} />
                      </Box>
                       <Box sx={dataItemContainerSx('calc(20.83% - 8px)')}>
                          <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="24h Turnover" secondary={<Box component="span" sx={valueDisplayBaseSx}>{ticker.turnover24h || 'N/A'}</Box>} />
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
