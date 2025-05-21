import { BybitApiResponse, BybitTicker, BybitApiResponseTicker, BybitInstrumentInfoResponse, BybitInstrumentInfo, BybitFundingHistoryResponse, FundingHistoryEntry } from './types';

const BASE_API_URL = 'https://api.bybit.com/v5/market';

// This function is kept for direct use by the instrumentStore or other specific needs.
// It fetches ALL instruments for a given category.
export async function fetchAllInstrumentsInfoForCategory(category: 'spot' | 'linear' | 'inverse'): Promise<BybitInstrumentInfo[]> {
  const API_ENDPOINT = `${BASE_API_URL}/instruments-info?category=${category}`;
  const response = await fetch(API_ENDPOINT);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.retMsg || `Failed to fetch instrument info for category ${category}`);
  }
  const data: BybitInstrumentInfoResponse = await response.json();
  if (data.retCode === 0 && data.result && data.result.list) {
    return data.result.list;
  }
  // If the instrument info list is empty or not present, but retCode is 0, return an empty array.
  // This can happen if the category exists but has no instruments listed under instruments-info for some reason.
  if (data.retCode === 0) {
    console.warn(`No instruments returned in 'list' for category ${category}, though API call was successful.`);
    return [];
  }
  throw new Error(data.retMsg || `Invalid API response structure for instrument info (category: ${category})`);
}

export async function fetchBybitTickers(category: 'spot' | 'linear' | 'inverse'): Promise<BybitTicker[]> {
  const API_ENDPOINT = `${BASE_API_URL}/tickers?category=${category}`;
  const [tickersResponse, instrumentsInfoResponse] = await Promise.all([
    fetch(API_ENDPOINT),
    fetchAllInstrumentsInfoForCategory(category) // Fetch all instruments for the category
  ]);

  if (!tickersResponse.ok) {
    const errorData = await tickersResponse.json();
    throw new Error(errorData.retMsg || `Failed to fetch Bybit ${category} tickers`);
  }
  const tickersData: BybitApiResponse = await tickersResponse.json();

  // Create a map for quick lookup of instrument info by symbol
  const instrumentsMap = new Map<string, BybitInstrumentInfo>();
  instrumentsInfoResponse.forEach(instrument => {
    instrumentsMap.set(instrument.symbol, instrument);
  });

  if (tickersData.retCode === 0 && tickersData.result && tickersData.result.list) {
    const processedTickers: BybitTicker[] = tickersData.result.list.map((apiTicker: BybitApiResponseTicker) => {
      const pChangeFactor = parseFloat(apiTicker.price24hPcnt);
      let storedPercentageString = "0.00"; // Default if parsing fails

      if (!isNaN(pChangeFactor)) {
        const actualPercentage = pChangeFactor * 100;
        if (actualPercentage >= 0) {
          storedPercentageString = `+${actualPercentage.toFixed(2)}`;
        } else {
          storedPercentageString = actualPercentage.toFixed(2);
        }
      } else {
        if (apiTicker.price24hPcnt && !apiTicker.price24hPcnt.startsWith('-') && !apiTicker.price24hPcnt.startsWith('+')){
            storedPercentageString = `+${apiTicker.price24hPcnt}`;
        } else {
            storedPercentageString = apiTicker.price24hPcnt || "+0.00";
        }
      }
      
      const instrumentInfo = instrumentsMap.get(apiTicker.symbol);

      return {
        ...apiTicker,
        price24hPcnt: storedPercentageString,
        baseCoin: instrumentInfo?.baseCoin,
        quoteCoin: instrumentInfo?.quoteCoin,
        settleCoin: instrumentInfo?.settleCoin,
      };
    });
    // Sort by turnover24h in descending order
    return processedTickers.sort((a, b) => parseFloat(b.turnover24h) - parseFloat(a.turnover24h));
  } else {
    throw new Error(tickersData.retMsg || 'Invalid API response structure for tickers');
  }
}

// This function fetches info for a SPECIFIC symbol within a category.
// It might still be useful if the store isn't populated or for a direct check,
// but primary data access for components should be via instrumentStore.
export async function getInstrumentsInfo(category: string, symbol: string): Promise<BybitInstrumentInfo[]> {
  const API_ENDPOINT = `${BASE_API_URL}/instruments-info?category=${category}&symbol=${symbol}`;
  const response = await fetch(API_ENDPOINT);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.retMsg || `Failed to fetch instrument info for ${symbol}`);
  }
  const data: BybitInstrumentInfoResponse = await response.json();
  if (data.retCode === 0 && data.result && data.result.list) {
    return data.result.list;
  } else {
    throw new Error(data.retMsg || 'Invalid API response structure for instrument info (symbol: ${symbol})');
  }
}

export async function fetchFundingRateHistory(
  category: 'linear' | 'inverse',
  symbol: string,
  limit: number = 10 // Default limit to 10 as it's a history view
): Promise<FundingHistoryEntry[]> {
  const API_ENDPOINT = `${BASE_API_URL}/funding/history?category=${category}&symbol=${symbol}&limit=${limit}`;
  const response = await fetch(API_ENDPOINT);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.retMsg || `Failed to fetch funding rate history for ${symbol}`);
  }
  const data: BybitFundingHistoryResponse = await response.json();
  if (data.retCode === 0 && data.result && data.result.list) {
    return data.result.list;
  } else if (data.retCode === 0 && (!data.result || !data.result.list)) {
    // Handle cases where API returns success but list is empty or missing (e.g. spot symbols)
    return []; 
  }
  throw new Error(data.retMsg || `Invalid API response structure for funding rate history (symbol: ${symbol})`);
}
