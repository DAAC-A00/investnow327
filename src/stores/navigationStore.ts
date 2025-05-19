'use client';

import { create } from 'zustand';

export interface NavLink {
  label: string;
  path: string;
  children?: NavLink[];
}

interface NavigationState {
  isDrawerOpen: boolean;
  appbarTitle: string;
  showMenuButton: boolean; // Use showMenuButton instead of showBackButton
  leftButtonAction: (() => void) | null; // Action for the left button
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setAppbarTitle: (title: string) => void;
  setLeftButtonAction: (action: (() => void) | null) => void; // Set action for left button
  setShowMenuButton: (show: boolean) => void; // Show/hide menu button
  navLinks: NavLink[];
}

const initialNavLinks: NavLink[] = [
  { label: 'Counter', path: '/counter' },
  { label: 'Todo List', path: '/todo' },
  { label: 'Exchange Rates', path: '/exchange-rates' },
  { label: 'Tickers', path: '/tickers' },
];

export const useNavigationStore = create<NavigationState>((set) => ({
  isDrawerOpen: false,
  appbarTitle: 'Tickers', // Default title
  showMenuButton: true, // Default to showing the menu button
  leftButtonAction: null, // Default left button action is null
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  setAppbarTitle: (title) => set({ appbarTitle: title }),
  setLeftButtonAction: (action) => set({ leftButtonAction: action }),
  setShowMenuButton: (show) => set({ showMenuButton: show }),
  navLinks: initialNavLinks,
}));
