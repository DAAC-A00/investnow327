'use client';

import React, { useEffect } from 'react';
import BybitTickerPageComponent from '@/components/BybitTickerPage';
import { useNavigationStore } from '@/stores/navigationStore';
import { useRouter } from 'next/navigation';

export default function BybitInverseTickersPage() {
  const { setAppbarTitle, setLeftButtonAction, setShowMenuButton } = useNavigationStore();
  const router = useRouter();

  useEffect(() => {
    // Set Appbar title and left button action when component mounts
    setAppbarTitle('Bybit Inverse Market Tickers (Live)');
    setLeftButtonAction(() => router.back()); // Set back button action
    setShowMenuButton(false); // Hide menu button

    return () => {
      // Reset Appbar title and left button when component unmounts
      setAppbarTitle('Tickers'); // Or your default title
      setLeftButtonAction(null); // Reset left button action
      setShowMenuButton(true); // Show menu button
    };
  }, [setAppbarTitle, setLeftButtonAction, setShowMenuButton, router]);

  return (
    <BybitTickerPageComponent 
      category="inverse" 
      title="" // Remove title from page content
    />
  );
}
