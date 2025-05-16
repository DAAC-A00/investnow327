'use client';

import React from 'react';
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  Box
} from '@mui/material';
import { ExchangeRateApiSuccessResponse } from '../../../services/exchangeRate/types';
import useExchangeRateStore from '../../../stores/exchangeRateStore';

interface RatesDisplayProps {
  ratesData: ExchangeRateApiSuccessResponse;
  searchTerm: string; // searchTerm prop 추가
}

export default function RatesDisplay({ ratesData, searchTerm }: RatesDisplayProps) {
  const lastFetchedAtLocal = useExchangeRateStore((state) => state.lastFetchedAtLocal);

  const filteredRates = Object.entries(ratesData.conversion_rates)
    .filter(([quoteCode]) => quoteCode !== ratesData.base_code) // base_code와 같은 화폐는 제외
    .filter(([quoteCode]) => 
      quoteCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Box>
      <Typography variant="h6" gutterBottom align="center" sx={{ mb: 2 }}>
        환율 페어 목록
      </Typography>
      {filteredRates.length === 0 && searchTerm && (
        <Typography align="center" color="text.secondary" sx={{my: 2}}>
          '{searchTerm}'(와)과 일치하는 통화가 없습니다.
        </Typography>
      )}
      <List dense sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0 }}>
        {filteredRates.map(([quoteCode, rate], index, array) => (
            <ListItem key={quoteCode} divider={index < array.length - 1}>
              <ListItemText
                primary={<Typography component="span" sx={{ fontWeight: 'medium' }}>{`${ratesData.base_code}/${quoteCode}`}</Typography>}
                secondary={<Typography component="span" variant="body2" color="text.secondary">{`${rate.toFixed(4)}`}</Typography>}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              />
            </ListItem>
          ))}
      </List>
      <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center' }}>
        API 데이터 최종 업데이트 (UTC): {new Date(ratesData.time_last_update_utc).toLocaleString()}
      </Typography>
      {lastFetchedAtLocal && (
        <Typography variant="caption" display="block" sx={{ mt: 0.5, textAlign: 'center' }}>
          앱 데이터 가져온 시간 (Local): {new Date(lastFetchedAtLocal).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}
