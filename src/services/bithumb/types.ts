// Bithumb API response types

export interface BithumbTickerData {
  opening_price: string;
  closing_price: string;
  min_price: string;
  max_price: string;
  units_traded: string;
  acc_trade_value: string;
  prev_closing_price: string;
  units_traded_24H: string;
  acc_trade_value_24H: string;
  fluctate_24H: string;
  fluctate_rate_24H: string;
  date: string;
}

export interface BithumbApiResponse {
  status: string;
  message?: string; // Error message when status is not '0000'
  data?: Record<string, BithumbTickerData>; // Optional because it might not be present in error responses
}

// Processed ticker for display
export interface BithumbTicker {
  symbol: string;        // Original symbol from API (e.g., 'BTC')
  market: 'KRW' | 'USDT' | 'BTC'; // Market type (KRW, USDT, BTC)
  pair: string;          // Formatted as 'BTC/KRW', 'ETH/USDT', etc.
  searchKey: string;     // Search key in format {baseCode}{quoteCode}{baseCode} (e.g., 'ETHKRWETH')
  lastPrice: string;
  prevPrice: string;
  highPrice: string;
  lowPrice: string;
  volume24h: string;
  value24h: string;
  priceChange24h: string;
  priceChangePercent24h: string; // Formatted with + or - sign
  timestamp: string;
}
