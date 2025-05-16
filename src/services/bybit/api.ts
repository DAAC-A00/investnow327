import { BybitApiResponse, BybitTicker, BybitApiResponseTicker } from './types';

const BASE_API_URL = 'https://api.bybit.com/v5/market/tickers';

export async function fetchBybitTickers(category: 'spot' | 'linear' | 'inverse'): Promise<BybitTicker[]> {
  const API_ENDPOINT = `${BASE_API_URL}?category=${category}`;
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
      };
    });
    // Sort by turnover24h in descending order
    return processedTickers.sort((a, b) => parseFloat(b.turnover24h) - parseFloat(a.turnover24h));
  } else {
    throw new Error(data.retMsg || 'Invalid API response structure');
  }
}
