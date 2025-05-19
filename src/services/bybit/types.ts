export interface BybitTicker { // For internal use and display
  symbol: string;
  lastPrice: string;
  bid1Price: string;
  ask1Price: string;
  price24hPcnt: string; // Formatted percentage string with sign
  volume24h: string;
  turnover24h: string;
  usdIndexPrice?: string;
  indexPrice?: string;
  markPrice?: string;
  prevPrice24h?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  prevPrice1h?: string;
  openInterest?: string;
  openInterestValue?: string;
  fundingRate?: string;
  nextFundingTime?: string; // Timestamp, needs formatting
  predictedDeliveryPrice?: string;
  basisRate?: string;
  deliveryFeeRate?: string;
  deliveryTime?: string; // Timestamp, needs formatting
  ask1Size?: string;
  bid1Size?: string;
  basis?: string;
  // Fields that might be present but are often empty or not as crucial for display
  preOpenPrice?: string;
  preQty?: string;
  curPreListingPhase?: string;
}

export interface BybitApiResponseTicker { // Directly maps to API response structure
  symbol: string;
  lastPrice: string;
  bid1Price: string;
  ask1Price: string;
  price24hPcnt: string; // Original string from API e.g. "0.0523", "-0.0210", "0.0000"
  volume24h: string;
  turnover24h: string;
  usdIndexPrice?: string;
  indexPrice?: string;
  markPrice?: string;
  prevPrice24h?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  prevPrice1h?: string;
  openInterest?: string;
  openInterestValue?: string;
  fundingRate?: string;
  nextFundingTime?: string;
  predictedDeliveryPrice?: string;
  basisRate?: string;
  deliveryFeeRate?: string;
  deliveryTime?: string;
  ask1Size?: string;
  bid1Size?: string;
  basis?: string;
  preOpenPrice?: string;
  preQty?: string;
  curPreListingPhase?: string;
}

export interface BybitApiResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: BybitApiResponseTicker[];
  };
  retExtInfo: any;
  time: number;
}
