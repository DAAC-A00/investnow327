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
  Button,
  Drawer,
  ListItemButton,
  ListItemIcon
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SortIcon from '@mui/icons-material/Sort';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { BybitTicker } from '@/services/bybit/types';
import { fetchBybitTickers } from '@/services/bybit/api';
import { useSearchStore } from '@/stores/searchStore';
import { useSortStore, SortableField, SortDirection, TickerCategory } from '@/stores/sortStore';

const REFRESH_INTERVAL = 1000;
const PRICE_EFFECT_DURATION = 200;

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
];

interface SuggestedSymbolInfo {
    symbol: string;
    lastPrice?: string;
    price24hPcnt?: string;
    originalChange?: number; 
    suggestionType: 'turnover' | 'positive' | 'negative';
}

const formatNumberWithCommas = (value: string | number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  const numStr = String(value);
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export default function BybitTickerPageComponent({ category, title }: BybitTickerPageProps) {
  const theme = useTheme();
  const [tickers, setTickers] = useState<DisplayTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const unifiedSuggestedSymbols: SuggestedSymbolInfo[] = useMemo(() => {
    if (!tickers || tickers.length === 0) return [];
    const suggestions: SuggestedSymbolInfo[] = [];
    const addedSymbols = new Set<string>();

    if (tickers[0]?.turnover24h !== undefined) {
        [...tickers]
          .filter(t => t.turnover24h && parseFloat(t.turnover24h) > 0)
          .sort((a, b) => parseFloat(b.turnover24h!) - parseFloat(a.turnover24h!))
          .slice(0, 3)
          .forEach(t => {
            if (!addedSymbols.has(t.symbol)) {
              suggestions.push({ 
                symbol: t.symbol, 
                lastPrice: t.lastPrice, 
                price24hPcnt: t.price24hPcnt,
                suggestionType: 'turnover' 
              });
              addedSymbols.add(t.symbol);
            }
          });
    }

    const positiveChangeSymbols = [...tickers]
      .filter(t => t.price24hPcnt && parseFloat(t.price24hPcnt) > 0)
      .sort((a, b) => parseFloat(b.price24hPcnt!) - parseFloat(a.price24hPcnt!));

    const negativeChangeSymbols = [...tickers]
      .filter(t => t.price24hPcnt && parseFloat(t.price24hPcnt) < 0)
      .sort((a, b) => parseFloat(a.price24hPcnt!) - parseFloat(b.price24hPcnt!));

    let positiveSlice = 3;
    let negativeSlice = 3;

    if (positiveChangeSymbols.length >= 3) {
        negativeSlice = 2;
    } else if (positiveChangeSymbols.length === 2) {
        negativeSlice = 3;
    } else if (positiveChangeSymbols.length === 1) {
        negativeSlice = 4;
    } else if (positiveChangeSymbols.length === 0) {
        negativeSlice = 5;
    }

    if (negativeChangeSymbols.length === 2) {
        positiveSlice = 3;
    } else if (negativeChangeSymbols.length === 1) {
        positiveSlice = 4;
    } else if (negativeChangeSymbols.length === 0) {
        positiveSlice = 5;
    }
    
    positiveChangeSymbols
      .slice(0, positiveSlice)
      .forEach(t => {
        if (!addedSymbols.has(t.symbol)) {
          suggestions.push({ 
            symbol: t.symbol, 
            lastPrice: t.lastPrice, 
            price24hPcnt: t.price24hPcnt, 
            originalChange: parseFloat(t.price24hPcnt!),
            suggestionType: 'positive' 
          });
          addedSymbols.add(t.symbol);
        }
      });

    negativeChangeSymbols
      .slice(0, negativeSlice)
      .forEach(t => {
        if (!addedSymbols.has(t.symbol)) {
          suggestions.push({ 
            symbol: t.symbol, 
            lastPrice: t.lastPrice, 
            price24hPcnt: t.price24hPcnt, 
            originalChange: parseFloat(t.price24hPcnt!),
            suggestionType: 'negative' 
          });
          addedSymbols.add(t.symbol);
        }
      });
    return suggestions;
  }, [tickers]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTermForCategory(category, event.target.value.toUpperCase());
    if(!showSuggestions && event.target.value !== '' && unifiedSuggestedSymbols.length > 0) {
        setShowSuggestions(true);
    }
  };
  
  const handleTextFieldFocus = () => {
    if (unifiedSuggestedSymbols.length > 0) {
        setShowSuggestions(true);
    }
  };

  const handleTextFieldBlur = () => {
    setTimeout(() => {
        setShowSuggestions(false);
    }, 150);
  };

  const handleSuggestionClick = (symbol: string) => {
    setSearchTermForCategory(category, symbol.toUpperCase());
    setShowSuggestions(false);
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
    if (sortField !== 'none' && sortField && sortableFieldsOptions.some(opt => opt.value === sortField)) {
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
            <Box sx={{ position: 'relative', flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' }, width: {sm: 'calc(60% - 8px)', md: 'auto'} }}>
                <TextField
                    fullWidth
                    label={`Search Symbol (e.g., ${category === 'inverse' ? 'BTCUSD' : 'BTCUSDT'})`}
                    variant="outlined"
                    value={searchTerm || ''}
                    onChange={handleSearchChange}
                    onFocus={handleTextFieldFocus}
                    onBlur={handleTextFieldBlur}
                />
                {showSuggestions && unifiedSuggestedSymbols.length > 0 && (
                    <Paper sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: theme.zIndex.modal,
                        maxHeight: 350, 
                        overflowY: 'auto',
                        border: `1px solid ${theme.palette.divider}`,
                        borderTop: 0,
                        borderBottomLeftRadius: theme.shape.borderRadius,
                        borderBottomRightRadius: theme.shape.borderRadius,
                        py: 0.5 
                    }}>
                        <List dense disablePadding>
                            {unifiedSuggestedSymbols.map((item) => {
                                let color = 'text.secondary';
                                if (item.suggestionType === 'turnover') {
                                    const change = parseFloat(item.price24hPcnt || '');
                                    if (change > 0) color = theme.palette.success.main;
                                    else if (change < 0) color = theme.palette.error.main;
                                } else if (item.originalChange) {
                                    if (item.originalChange > 0) color = theme.palette.success.main;
                                    else if (item.originalChange < 0) color = theme.palette.error.main;
                                }
                                return (
                                    <ListItemButton key={`suggestion-${item.symbol}`} onClick={() => handleSuggestionClick(item.symbol)} sx={{py:0.5}}>
                                        <ListItemIcon sx={{minWidth: 'auto', mr: 1}}>
                                            {item.suggestionType === 'turnover' && <LocalFireDepartmentIcon fontSize="small" sx={{color: theme.palette.warning.main}} />}
                                            {item.suggestionType === 'positive' && <TrendingUpIcon fontSize="small" color="success" />}
                                            {item.suggestionType === 'negative' && <TrendingDownIcon fontSize="small" color="error" />}
                                        </ListItemIcon>
                                        <ListItemText primary={item.symbol} sx={{ flexGrow: 1, mr: 1 }} />
                                        <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                                            <Typography variant="body2" component="div" sx={{ lineHeight: 1.2 }}>{formatNumberWithCommas(item.lastPrice)}</Typography>
                                            <Typography
                                                variant="caption"
                                                component="div"
                                                sx={{
                                                    lineHeight: 1.2,
                                                    color: color
                                                }}
                                            >
                                                {formatNumberWithCommas(item.price24hPcnt)}%
                                            </Typography>
                                        </Box>
                                    </ListItemButton>
                                );
                            })}
                        </List>
                    </Paper>
                )}
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
              const displayPercentText = `${formatNumberWithCommas(ticker.price24hPcnt)}%`;
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
              
              // Adjusted flexBasis for 5 items: Symbol, Price, Change, Pair, Settle Coin (if present)
              const numItems = ticker.settleCoin ? 5 : 4;
              const mdFlexBasis = numItems === 5 ? 'calc(20% - 8px)' : 'calc(25% - 8px)';
              const smFlexBasis = numItems === 5 ? 'calc(20% - 8px)' : 'calc(25% - 8px)'; // can be same as md or different

              const dataItemContainerSx = (isSymbol = false) => ({
                flexBasis: { xs: 'calc(50% - 4px)', sm: smFlexBasis, md: isSymbol ? 'calc(20% - 8px)' : mdFlexBasis }, // Symbol can be wider
                width: { xs: 'calc(50% - 4px)', sm: smFlexBasis, md: isSymbol ? 'calc(20% - 8px)' : mdFlexBasis },
              });
              
              const pairText = `${ticker.baseCoin || ''}/${ticker.quoteCoin || ''}`;

              return (
                <React.Fragment key={ticker.symbol}>
                  <ListItem 
                    component={Link} 
                    href={`/tickers/bybit/${category}/${ticker.symbol}`}
                    sx={{ py: 1.5, '&:hover': { backgroundColor: theme.palette.action.hover }, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', width: '100%', gap: 1 }}>
                      <Box sx={{ ...dataItemContainerSx(true), pr:1 }}>
                          <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>{ticker.symbol}</Typography>
                      </Box>
                      <Box sx={dataItemContainerSx()}> 
                          <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="Last Price" secondary={<Box component="span" sx={lastPriceValueSx}>{formatNumberWithCommas(ticker.lastPrice)}</Box>} />
                      </Box>
                      <Box sx={dataItemContainerSx()}>
                          <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="24h Change" secondary={<Box component="span" sx={changeValueSx}>{displayPercentText}</Box>} />
                      </Box>
                      <Box sx={dataItemContainerSx()}>
                          <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="Pair" secondary={<Box component="span" sx={valueDisplayBaseSx}>{pairText === '/' ? 'N/A' : pairText}</Box>} />
                      </Box>
                      {ticker.settleCoin && (
                        <Box sx={dataItemContainerSx()}>
                            <ListItemText primaryTypographyProps={{variant:'caption', color:'text.secondary'}} primary="Settle Coin" secondary={<Box component="span" sx={valueDisplayBaseSx}>{ticker.settleCoin}</Box>} />
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                  {index < processedTickers.length - 1 && <Divider />}
                </React.Fragment>
              );
            }) }
          </List>
        )}
      </Paper>
    </Container>
  );
}
