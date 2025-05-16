'use client';

import React from 'react';
import BybitTickerPageComponent from '@/components/BybitTickerPage';

export default function BybitInverseTickersPage() {
  return (
    <BybitTickerPageComponent 
      category="inverse" 
      title="Bybit Inverse Market Tickers (Live & Sorted by Turnover)" 
    />
  );
}
