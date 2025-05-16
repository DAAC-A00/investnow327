'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  SelectChangeEvent
} from '@mui/material';

const API_KEY = '842f9ce049b12b202bc6932f'; 
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW', 'INR'];

interface ExchangeRatesData {
  base_code: string;
  conversion_rates: { [key: string]: number };
  time_last_update_utc: string;
}

export default function ExchangeRatesPage() {
  const [ratesData, setRatesData] = useState<ExchangeRatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState('USD');

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData['error-type'] || 'Failed to fetch exchange rates');
        }
        const data: ExchangeRatesData = await response.json();
        setRatesData(data);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
      }
      setLoading(false);
    };

    fetchRates();
  }, [baseCurrency]);

  const handleBaseCurrencyChange = (event: SelectChangeEvent<string>) => {
    setBaseCurrency(event.target.value as string);
  };

  if (error) {
    return <Container><Paper sx={{p:2, mt: 2}}><Alert severity="error">Error fetching data: {error}</Alert></Paper></Container>;
  }

  return (
    <Container maxWidth="md"> {/* Changed maxWidth for a more focused list view */}
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          환율 정보
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
            <FormControl sx={{ m: 1, minWidth: 150 }}> 
              <InputLabel id="base-currency-label">기준 통화</InputLabel>
              <Select
                labelId="base-currency-label"
                value={baseCurrency}
                label="기준 통화"
                onChange={handleBaseCurrencyChange}
              >
                {SUPPORTED_CURRENCIES.map(curr => <MenuItem key={curr} value={curr}>{curr}</MenuItem>)}
              </Select>
            </FormControl>
        </Box>

        {loading && <Box sx={{display: 'flex', justifyContent: 'center', my: 3}}><CircularProgress /></Box>}
        
        {ratesData && !loading && (
          <Box>
            <Typography variant="h6" gutterBottom align="center" sx={{mb:2}}>
              1 {ratesData.base_code} 기준 환율
            </Typography>
            <List dense sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p:0 }}>
              {Object.entries(ratesData.conversion_rates)
                .filter(([currencyCode]) => SUPPORTED_CURRENCIES.includes(currencyCode) && currencyCode !== ratesData.base_code)
                .map(([currencyCode, rate], index, array) => (
                <ListItem key={currencyCode} divider={index < array.length -1}>
                  <ListItemText 
                    primary={<Typography component="span" sx={{fontWeight: 'medium'}}>{currencyCode}</Typography>} 
                    secondary={<Typography component="span" variant="body2" color="text.secondary">{`${rate.toFixed(4)}`}</Typography>} 
                    sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="caption" display="block" sx={{mt: 2, textAlign: 'center'}}>
                최종 업데이트 (UTC): {new Date(ratesData.time_last_update_utc).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
