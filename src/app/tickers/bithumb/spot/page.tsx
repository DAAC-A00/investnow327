'use client';

import React, { useEffect } from 'react';
import BithumbTickerPageComponent from '@/components/BithumbTickerPage';
import { useNavigationStore } from '@/stores/navigationStore';
import { useRouter } from 'next/navigation';

export default function BithumbSpotTickersPage() {
  const { setAppbarTitle, setLeftButtonAction, setShowMenuButton } = useNavigationStore();
  const router = useRouter();

  useEffect(() => {
    // Set Appbar title and left button action when component mounts
    setAppbarTitle('Bithumb Market Tickers (Live)');
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
    <BithumbTickerPageComponent 
      title="" // Remove title from page content
    />
  );
}
