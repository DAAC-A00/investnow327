export interface BybitTicker {
  symbol: string;
  lastPrice: string;
  bid1Price: string;
  ask1Price: string;
  price24hPcnt: string; // Stores formatted percentage string with sign e.g. "+5.23", "-2.10", "+0.00"
  volume24h: string;
  turnover24h: string;
  usdIndexPrice?: string;
}

export interface BybitApiResponseTicker {
  symbol: string;
  lastPrice: string;
  bid1Price: string;
  ask1Price: string;
  price24hPcnt: string; // Original string from API e.g. "0.0523", "-0.0210", "0.0000"
  volume24h: string;
  turnover24h: string;
  usdIndexPrice?: string;
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
