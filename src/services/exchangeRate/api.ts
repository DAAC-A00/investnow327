import useExchangeRateStore from '../../stores/exchangeRateStore';
import { ExchangeRateApiResponse, ExchangeRateApiSuccessResponse } from './types';

const API_URL = 'https://v6.exchangerate-api.com/v6/842f9ce049b12b202bc6932f/latest/USD';

export async function fetchExchangeRates(): Promise<ExchangeRateApiSuccessResponse> {
  const store = useExchangeRateStore.getState();
  const todayUTC = new Date().toISOString().split('T')[0];

  // 스토어의 데이터는 항상 성공 응답이므로, ExchangeRateApiSuccessResponse 타입입니다.
  if (store.exchangeRateData && store.lastUpdatedAt === todayUTC) {
    console.log('Using cached exchange rate data for today (UTC):', todayUTC);
    return store.exchangeRateData;
  }

  console.log('Fetching fresh exchange rate data...');
  const response = await fetch(API_URL);
  // API 응답은 성공 또는 에러일 수 있으므로 ExchangeRateApiResponse로 타입 지정
  const data: ExchangeRateApiResponse = await response.json();

  if (!response.ok || data.result === 'error') {
    // data.result === 'error' 타입 가드를 통해 data가 ExchangeRateApiErrorResponse 타입임을 명시
    if (data.result === 'error') {
      throw new Error(data["error-type"] || 'Failed to fetch exchange rates due to API error');
    } else {
      // response.ok가 false이지만 data.result가 'error'가 아닌 경우 (예: 네트워크 문제로 JSON 파싱 실패 등)
      throw new Error('Failed to fetch exchange rates. HTTP status: ' + response.status);
    }
  }

  // 여기서 data는 ExchangeRateApiSuccessResponse 타입임이 보장됩니다.
  // (위의 if 조건에서 에러 케이스가 모두 처리되었기 때문)
  // 명시적으로 타입을 단언하거나, 타입 가드를 한 번 더 사용할 수 있습니다.
  if (data.result === 'success') {
    useExchangeRateStore.getState().setExchangeRateData(data);
    return data;
  } else {
    // 이론적으로 이 부분은 도달하지 않아야 하지만, 안전을 위해 에러 처리
    console.error('Unexpected API response structure after success check:', data);
    throw new Error('Unexpected API response structure.');
  }
}
