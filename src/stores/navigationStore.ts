'use client';

import { create } from 'zustand';

export interface NavLink {
  label: string;
  path: string;
  children?: NavLink[]; // Kept for potential future nesting, but not used for Tickers now
}

interface NavigationState {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  navLinks: NavLink[];
}

const initialNavLinks: NavLink[] = [
  { label: 'Counter', path: '/counter' },
  { label: 'Todo List', path: '/todo' },
  { label: 'Exchange Rates', path: '/exchange-rates' },
  { label: 'Tickers', path: '/tickers' }, // New Tickers Hub Page
  // The "More" menu and its children are removed as per the new structure
  { label: 'Service Description', path: '/service-description' },
];

export const useNavigationStore = create<NavigationState>((set) => ({
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  navLinks: initialNavLinks,
}));
