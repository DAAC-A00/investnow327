import { create } from 'zustand';
import { BybitInstrumentInfo, BybitInstrumentInfoResponse } from '@/services/bybit/types';

const BASE_API_URL = 'https://api.bybit.com/v5/market';

interface InstrumentStoreState {
  instruments: {
    spot: BybitInstrumentInfo[];
    linear: BybitInstrumentInfo[];
    inverse: BybitInstrumentInfo[];
  };
  loading: {
    spot: boolean;
    linear: boolean;
    inverse: boolean;
  };
  error: {
    spot: string | null;
    linear: string | null;
    inverse: string | null;
  };
  fetchInstruments: (category: 'spot' | 'linear' | 'inverse') => Promise<void>;
  getInstrumentBySymbol: (category: 'spot' | 'linear' | 'inverse', symbol: string) => BybitInstrumentInfo | undefined;
  getInstrumentsByCategory: (category: 'spot' | 'linear' | 'inverse') => BybitInstrumentInfo[];
}

export const useInstrumentStore = create<InstrumentStoreState>((set, get) => ({
  instruments: {
    spot: [],
    linear: [],
    inverse: [],
  },
  loading: {
    spot: false,
    linear: false,
    inverse: false,
  },
  error: {
    spot: null,
    linear: null,
    inverse: null,
  },
  fetchInstruments: async (category) => {
    if (get().instruments[category].length > 0 || get().loading[category]) {
      // Data already exists or is being fetched, no need to fetch again
      return;
    }

    set(state => ({
      loading: { ...state.loading, [category]: true },
      error: { ...state.error, [category]: null },
    }));

    try {
      const API_ENDPOINT = `${BASE_API_URL}/instruments-info?category=${category}`;
      const response = await fetch(API_ENDPOINT);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.retMsg || `Failed to fetch instrument info for category ${category}`);
      }
      const data: BybitInstrumentInfoResponse = await response.json();

      if (data.retCode === 0 && data.result && data.result.list) {
        set(state => ({
          instruments: { ...state.instruments, [category]: data.result.list },
          loading: { ...state.loading, [category]: false },
        }));
      } else {
        throw new Error(data.retMsg || `Invalid API response structure for instrument info (${category})`);
      }
    } catch (err: any) {
      console.error(`Error fetching instrument info for ${category}:`, err.message);
      set(state => ({
        error: { ...state.error, [category]: err.message || 'An unknown error occurred' },
        loading: { ...state.loading, [category]: false },
      }));
    }
  },
  getInstrumentBySymbol: (category, symbol) => {
    const categoryInstruments = get().instruments[category];
    return categoryInstruments.find(instrument => instrument.symbol === symbol);
  },
  getInstrumentsByCategory: (category) => {
    return get().instruments[category];
  }
}));
