'use client';

import React from 'react';
import BybitTickerPageComponent from '@/components/BybitTickerPage';

export default function BybitLinearTickersPage() {
  return (
    <BybitTickerPageComponent 
      category="linear" 
      title="Bybit Linear Market Tickers (Live & Sorted by Turnover)" 
    />
  );
}
