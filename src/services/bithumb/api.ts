import { BithumbApiResponse, BithumbTicker } from './types';

const BASE_API_URL = 'https://api.bithumb.com/public/ticker';

// Response type for fetchBithumbTickers
export interface BithumbTickersResponse {
  tickers: BithumbTicker[];
  marketStatus: {
    KRW: boolean;
    USDT: boolean;
    BTC: boolean;
  };
  errorMessages?: {
    KRW?: string;
    USDT?: string;
    BTC?: string;
  };
}

// Function to fetch tickers from all three markets (KRW, USDT, BTC) and combine them
export async function fetchBithumbTickers(): Promise<BithumbTickersResponse> {
  try {
    // Fetch tickers from all three markets in parallel
    const [krwResponse, usdtResponse, btcResponse] = await Promise.all([
      fetch(`${BASE_API_URL}/ALL_KRW`),
      fetch(`${BASE_API_URL}/ALL_USDT`),
      fetch(`${BASE_API_URL}/ALL_BTC`)
    ]);

    // Check if any of the responses failed
    if (!krwResponse.ok || !usdtResponse.ok || !btcResponse.ok) {
      const failedResponses = [];
      if (!krwResponse.ok) failedResponses.push('KRW');
      if (!usdtResponse.ok) failedResponses.push('USDT');
      if (!btcResponse.ok) failedResponses.push('BTC');
      throw new Error(`Failed to fetch Bithumb tickers for markets: ${failedResponses.join(', ')}`);
    }

    // Parse the responses
    const krwData: BithumbApiResponse = await krwResponse.json();
    const usdtData: BithumbApiResponse = await usdtResponse.json();
    const btcData: BithumbApiResponse = await btcResponse.json();

    // Create market status object
    const marketStatus = {
      KRW: krwData.status === '0000',
      USDT: usdtData.status === '0000',
      BTC: btcData.status === '0000'
    };
    
    // Collect error messages if any
    const errorMessages: {KRW?: string; USDT?: string; BTC?: string} = {};
    
    if (!marketStatus.KRW) {
      errorMessages.KRW = krwData.message || 'Unknown error for KRW market';
    }
    
    if (!marketStatus.USDT) {
      errorMessages.USDT = usdtData.message || 'Unknown error for USDT market';
    }
    
    if (!marketStatus.BTC) {
      errorMessages.BTC = btcData.message || 'Unknown error for BTC market';
    }
    
    // If all responses have errors, throw an error with the messages
    if (!marketStatus.KRW && !marketStatus.USDT && !marketStatus.BTC) {
      const errorMessage = Object.entries(errorMessages)
        .map(([market, message]) => `${market}: ${message}`)
        .join('\n');
      throw new Error(`Bithumb API error: ${errorMessage}`);
    }
    
    // Process and combine the ticker data from successful responses
    const combinedTickers: BithumbTicker[] = [
      ...(marketStatus.KRW ? processTickers(krwData, 'KRW') : []),
      ...(marketStatus.USDT ? processTickers(usdtData, 'USDT') : []),
      ...(marketStatus.BTC ? processTickers(btcData, 'BTC') : [])
    ];
    
    // Sort by volume (highest first)
    const sortedTickers = combinedTickers.sort((a, b) => parseFloat(b.value24h) - parseFloat(a.value24h));
    
    // Return both the tickers and market status
    return {
      tickers: sortedTickers,
      marketStatus,
      errorMessages: Object.keys(errorMessages).length > 0 ? errorMessages : undefined
    };
  } catch (error) {
    console.error('Error fetching Bithumb tickers:', error);
    throw error;
  }
}

// Helper function to process tickers from a specific market
function processTickers(response: BithumbApiResponse, market: 'KRW' | 'USDT' | 'BTC'): BithumbTicker[] {
  if (response.status !== '0000' || !response.data) {
    const errorMessage = response.message || `Invalid or empty response for ${market} market`;
    console.warn(errorMessage);
    return [];
  }

  const tickers: BithumbTicker[] = [];
  // Extract date and handle it as a string
  const date = typeof response.data.date === 'string' ? response.data.date : '';
  // Create a copy of data without the date property
  const { date: _, ...tickerData } = response.data;

  // Process each ticker in the response
  Object.entries(tickerData).forEach(([symbol, data]) => {
    // Skip the timestamp entry
    if (symbol === 'date') return;

    // Format the price change percentage with + or - sign
    const changePercent = parseFloat(data.fluctate_rate_24H);
    const formattedChangePercent = changePercent >= 0 
      ? `+${changePercent.toFixed(2)}` 
      : changePercent.toFixed(2);
    
    // Create pair representation (e.g., 'BTC/KRW')
    const pair = `${symbol}/${market}`;
    
    // Create search key in format {baseCode}{quoteCode}{baseCode} (e.g., 'ETHKRWETH')
    const searchKey = `${symbol}${market}${symbol}`;

    tickers.push({
      symbol,
      market,
      pair,
      searchKey,
      lastPrice: data.closing_price,
      prevPrice: data.prev_closing_price,
      highPrice: data.max_price,
      lowPrice: data.min_price,
      volume24h: data.units_traded_24H,
      value24h: data.acc_trade_value_24H,
      priceChange24h: data.fluctate_24H,
      priceChangePercent24h: formattedChangePercent,
      timestamp: date
    });
  });

  return tickers;
}
