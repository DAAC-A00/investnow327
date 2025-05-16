'use client';

import React from 'react';
import BybitTickerPageComponent from '@/components/BybitTickerPage';

export default function BybitSpotTickersPage() {
  return (
    <BybitTickerPageComponent 
      category="spot" 
      title="Bybit Spot Market Tickers (Live & Sorted by Turnover)" 
    />
  );
}
