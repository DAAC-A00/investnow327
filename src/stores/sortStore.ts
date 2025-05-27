import { create } from 'zustand';
import { BybitTicker } from '@/services/bybit/types';

export type TickerBybitCategory = 'spot' | 'linear' | 'inverse';
export type SortableField = keyof Pick<BybitTicker, 'symbol' | 'lastPrice' | 'price24hPcnt' | 'volume24h' | 'turnover24h'> | 'none';
export type SortDirection = 'asc' | 'desc';

interface SortState {
  sortCriteria: Record<TickerBybitCategory, { field: SortableField; direction: SortDirection }>;
  setSortCriteria: (category: TickerBybitCategory, field: SortableField, direction: SortDirection) => void;
}

const initialSortCriteria: { field: SortableField; direction: SortDirection } = {
  field: 'turnover24h', // Default sort field
  direction: 'desc',     // Default sort direction
};

export const useSortStore = create<SortState>((set) => ({
  sortCriteria: {
    spot: { ...initialSortCriteria },
    linear: { ...initialSortCriteria },
    inverse: { ...initialSortCriteria },
  },
  setSortCriteria: (category, field, direction) =>
    set((state) => ({
      sortCriteria: {
        ...state.sortCriteria,
        [category]: { field, direction },
      },
    })),
}));
