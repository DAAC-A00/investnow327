'use client';

import React from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  SelectChangeEvent
} from '@mui/material';

interface CurrencySelectorProps {
  baseCurrency: string;
  onBaseCurrencyChange: (event: SelectChangeEvent<string>) => void;
  supportedCurrencies: string[];
}

export default function CurrencySelector({
  baseCurrency,
  onBaseCurrencyChange,
  supportedCurrencies,
}: CurrencySelectorProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
      <FormControl sx={{ m: 1, minWidth: 150 }}>
        <InputLabel id="base-currency-label">기준 통화</InputLabel>
        <Select
          labelId="base-currency-label"
          value={baseCurrency}
          label="기준 통화"
          onChange={onBaseCurrencyChange}
        >
          {supportedCurrencies.map(curr => <MenuItem key={curr} value={curr}>{curr}</MenuItem>)}
        </Select>
      </FormControl>
    </Box>
  );
}
