import { create } from 'zustand';

type TickerCategory = 'spot' | 'linear' | 'inverse';

interface SearchState {
  searchTerms: Record<TickerCategory, string>;
  setSearchTerm: (category: TickerCategory, term: string) => void;
  // No need for a specific getter, components can select the part of the state they need.
}

export const useSearchStore = create<SearchState>((set) => ({
  searchTerms: {
    spot: '',
    linear: '',
    inverse: '',
  },
  setSearchTerm: (category, term) =>
    set((state) => ({
      searchTerms: {
        ...state.searchTerms,
        [category]: term,
      },
    })),
}));
