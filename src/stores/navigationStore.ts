'use client';

import { create } from 'zustand';

export interface NavLink {
  label: string;
  path: string;
  children?: NavLink[];
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
  {
    label: 'More',
    path: '#', // Main link for More
    children: [
      {
        label: 'Tickers',
        path: '#', // Sub-menu for Tickers
        children: [
          { label: 'Spot', path: '/bybit-spot-tickers' },
          { label: 'Linear', path: '/bybit-linear-tickers' },
          { label: 'Inverse', path: '/bybit-inverse-tickers' },
        ],
      },
      // Future items under "More" can be added here
    ],
  },
  { label: 'Service Description', path: '/service-description' },
];

export const useNavigationStore = create<NavigationState>((set) => ({
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  navLinks: initialNavLinks,
}));
