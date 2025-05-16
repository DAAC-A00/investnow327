import { create } from 'zustand';
import { ExchangeRateApiSuccessResponse } from '../services/exchangeRate/types';

interface ExchangeRateState {
  exchangeRateData: ExchangeRateApiSuccessResponse | null;
  lastUpdatedAt: string | null; // YYYY-MM-DD (UTC 기준, API 데이터 기준)
  lastFetchedAtLocal: string | null; // ISO string (로컬 시간, 앱이 데이터를 가져온 시간)
  setExchangeRateData: (data: ExchangeRateApiSuccessResponse) => void;
}

const useExchangeRateStore = create<ExchangeRateState>((set) => ({
  exchangeRateData: null,
  lastUpdatedAt: null,
  lastFetchedAtLocal: null,
  setExchangeRateData: (data) => {
    const lastUpdateDateUTC = new Date(data.time_last_update_utc).toISOString().split('T')[0];
    const fetchedAt = new Date().toISOString(); // 현재 로컬 시간을 ISO 문자열로 저장
    set({
      exchangeRateData: data,
      lastUpdatedAt: lastUpdateDateUTC,
      lastFetchedAtLocal: fetchedAt,
    });
  },
}));

export default useExchangeRateStore;
