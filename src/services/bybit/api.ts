import { BybitApiResponse, BybitTicker, BybitApiResponseTicker, BybitInstrumentInfoResponse, BybitInstrumentInfo } from './types';

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
  const response = await fetch(API_ENDPOINT);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.retMsg || `Failed to fetch Bybit ${category} tickers`);
  }
  const data: BybitApiResponse = await response.json();

  if (data.retCode === 0 && data.result && data.result.list) {
    const processedTickers: BybitTicker[] = data.result.list.map((apiTicker: BybitApiResponseTicker) => {
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
      return {
        ...apiTicker,
        price24hPcnt: storedPercentageString,
        // tickSize is no longer added here; it will be retrieved from instrumentStore in components
      };
    });
    // Sort by turnover24h in descending order
    return processedTickers.sort((a, b) => parseFloat(b.turnover24h) - parseFloat(a.turnover24h));
  } else {
    throw new Error(data.retMsg || 'Invalid API response structure for tickers');
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
