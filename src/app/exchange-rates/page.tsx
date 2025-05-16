'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Box,
  TextField // TextField 추가
  // SelectChangeEvent // CurrencySelector를 사용하지 않는다면 이것도 제거 가능
} from '@mui/material';
import { fetchExchangeRates } from '../../services/exchangeRate/api';
import { ExchangeRateApiSuccessResponse } from '../../services/exchangeRate/types'; 
import RatesDisplay from './components/RatesDisplay';

export default function ExchangeRatesPage() {
  const [ratesData, setRatesData] = useState<ExchangeRateApiSuccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // 검색어 상태 추가

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExchangeRates();
      setRatesData(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
      setRatesData(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  if (error) {
    return <Container><Paper sx={{ p: 2, mt: 2 }}><Alert severity="error">Error fetching data: {error}</Alert></Paper></Container>;
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          환율 정보
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
          <TextField 
            label="통화 검색 (예: KRW)" 
            variant="outlined" 
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{width: '50%', minWidth: '200px'}}
          />
        </Box>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
        
        {ratesData && !loading && (
          <RatesDisplay ratesData={ratesData} searchTerm={searchTerm} /> // searchTerm prop 전달
        )}
      </Paper>
    </Container>
  );
}
