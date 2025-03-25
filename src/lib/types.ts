
export interface Coin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  image: string;
  sparkline?: number[];
  description?: string;
  rank?: number;
  supply?: {
    circulating: number;
    total: number;
    max?: number;
  };
}

export interface ChartData {
  timestamp: number;
  price: number;
}

export interface TimeRange {
  label: string;
  value: string;
}

export interface TradeOrder {
  id: string;
  type: 'buy' | 'sell';
  coinId: string;
  price: number;
  amount: number;
  total: number;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface PortfolioAsset {
  coinId: string;
  amount: number;
  valueUSD: number;
  averageBuyPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  portfolio: PortfolioAsset[];
  balance: {
    available: number;
    locked: number;
  };
  watchlist: string[];
  orders: TradeOrder[];
}
