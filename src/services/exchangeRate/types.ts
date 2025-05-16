export interface ConversionRates {
  [key: string]: number;
}

// 성공 응답 타입
export interface ExchangeRateApiSuccessResponse {
  result: "success";
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: ConversionRates;
}

// 에러 응답 타입
export interface ExchangeRateApiErrorResponse {
  result: "error";
  "error-type": string; // e.g., "invalid-key", "malformed-request", "unsupported-code"
  documentation?: string; // 에러 시에도 포함될 수 있는 선택적 필드
  terms_of_use?: string;  // 에러 시에도 포함될 수 있는 선택적 필드
}

// API 응답 통합 타입
export type ExchangeRateApiResponse = ExchangeRateApiSuccessResponse | ExchangeRateApiErrorResponse;
