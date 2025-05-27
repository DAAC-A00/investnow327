'use client';

import React, { useEffect } from 'react';
import BybitTickerPageComponent from '@/components/BybitTickerPage';
import { useNavigationStore } from '@/stores/navigationStore';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { TickerBybitCategory } from '@/stores/sortStore';

// Inner component that receives unwrapped params
function CategoryTickerContent({ category }: { category: string }) {
  const { setAppbarTitle, setLeftButtonAction, setShowMenuButton } = useNavigationStore();
  const router = useRouter();

  // Validate category
  if (!['inverse', 'linear', 'spot'].includes(category)) {
    notFound();
  }

  // Format category name for display (capitalize first letter)
  const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);

  useEffect(() => {
    // Set Appbar title and left button action when component mounts
    setAppbarTitle(`Bybit ${formattedCategory} Market Tickers (Live)`);
    setLeftButtonAction(() => router.back()); // Set back button action
    setShowMenuButton(false); // Hide menu button

    return () => {
      // Reset Appbar title and left button when component unmounts
      setAppbarTitle('Tickers'); // Or your default title
      setLeftButtonAction(null); // Reset left button action
      setShowMenuButton(true); // Show menu button
    };
  }, [setAppbarTitle, setLeftButtonAction, setShowMenuButton, router, formattedCategory]);

  return (
    <BybitTickerPageComponent 
      category={category as TickerBybitCategory} 
      title="" // Remove title from page content
    />
  );
}

// Define the params type
type PageParams = {
  category: string;
};

// Main page component that unwraps params using React.use()
export default function BybitCategoryTickersPage({ params }: { params: Promise<PageParams> }) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params) as PageParams;
  const { category } = unwrappedParams;
  
  return <CategoryTickerContent category={category} />;
}
