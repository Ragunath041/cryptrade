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
  rank: number;
  supply: {
    circulating: number;
    total: number;
    max: number | null;
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
  type: 'buy' | 'sell' | 'long' | 'short';
  coinId: string;
  price: number;
  amount: number;
  total: number;
  status: 'open' | 'filled' | 'cancelled' | 'completed';
  timestamp: number;
}

export interface PortfolioAsset {
  coinId: string;
  symbol: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  valueUSD: number;
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

// Demo trading types
export interface DemoAccount {
  balance: number;
  portfolio: DemoPortfolioAsset[];
  openPositions: DemoPosition[];
  closedPositions: DemoPosition[];
  tradingHistory: DemoTrade[];
}

export interface DemoPortfolioAsset {
  coinId: string;
  symbol: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  valueUSD: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface DemoPosition {
  id: string;
  coinId: string;
  symbol: string;
  type: 'long' | 'short';
  amount: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  takeProfit?: number;
  stopLoss?: number;
  status: 'open' | 'closed';
  profitLoss: number;
  profitLossPercentage: number;
  timestamp: number;
  openTime?: number;
  closeTime?: number;
}

export interface DemoTrade {
  id: string;
  coinId: string;
  symbol: string;
  type: 'buy' | 'sell' | 'open_long' | 'close_long' | 'open_short' | 'close_short';
  price: number;
  amount: number;
  total: number;
  timestamp: number;
  fee: number;
  positionId?: string;
}
