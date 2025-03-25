
import { Coin, ChartData, UserProfile } from "./types";

// Mock data for cryptocurrencies
const mockCoins: Coin[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    price: 65432.78,
    change24h: 2.34,
    volume24h: 25674983712,
    marketCap: 1267894532167,
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    sparkline: [64213, 64578, 65102, 65324, 65198, 65432],
    description: "Bitcoin is a decentralized digital currency, without a central bank or single administrator, that can be sent from user to user on the peer-to-peer bitcoin network without the need for intermediaries.",
    rank: 1,
    supply: {
      circulating: 19356425,
      total: 19356425,
      max: 21000000,
    },
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    price: 3562.14,
    change24h: 1.25,
    volume24h: 14532976521,
    marketCap: 427865324167,
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    sparkline: [3512.43, 3524.67, 3545.89, 3552.01, 3557.12, 3562.14],
    rank: 2,
    supply: {
      circulating: 120297765,
      total: 120297765,
    },
  },
  {
    id: "tether",
    name: "Tether",
    symbol: "USDT",
    price: 1.00,
    change24h: 0.01,
    volume24h: 67854329876,
    marketCap: 94765432198,
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    sparkline: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    rank: 3,
    supply: {
      circulating: 94765432198,
      total: 94765432198,
    },
  },
  {
    id: "binancecoin",
    name: "Binance Coin",
    symbol: "BNB",
    price: 567.32,
    change24h: -1.27,
    volume24h: 2347651298,
    marketCap: 87654329876,
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    sparkline: [574.52, 572.13, 570.45, 568.92, 567.85, 567.32],
    rank: 4,
    supply: {
      circulating: 154533954,
      total: 166801148,
      max: 200000000,
    },
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    price: 143.76,
    change24h: 5.63,
    volume24h: 5674329876,
    marketCap: 64578932167,
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    sparkline: [136.24, 137.89, 139.45, 141.23, 142.56, 143.76],
    rank: 5,
    supply: {
      circulating: 449267194,
      total: 559429935,
    },
  },
  {
    id: "ripple",
    name: "XRP",
    symbol: "XRP",
    price: 0.5432,
    change24h: -0.34,
    volume24h: 1987654321,
    marketCap: 28976543210,
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    sparkline: [0.545, 0.544, 0.542, 0.541, 0.543, 0.5432],
    rank: 6,
    supply: {
      circulating: 53356340656,
      total: 99989148025,
      max: 100000000000,
    },
  },
  {
    id: "cardano",
    name: "Cardano",
    symbol: "ADA",
    price: 0.4321,
    change24h: 1.23,
    volume24h: 876543210,
    marketCap: 15243678901,
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    sparkline: [0.427, 0.428, 0.430, 0.431, 0.432, 0.4321],
    rank: 7,
    supply: {
      circulating: 35266773334,
      total: 45000000000,
      max: 45000000000,
    },
  },
  {
    id: "polkadot",
    name: "Polkadot",
    symbol: "DOT",
    price: 6.54,
    change24h: 2.45,
    volume24h: 654321987,
    marketCap: 8765432198,
    image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    sparkline: [6.38, 6.41, 6.45, 6.49, 6.52, 6.54],
    rank: 8,
    supply: {
      circulating: 1339733399,
      total: 1339733399,
    },
  },
];

// Mock user profile data
const mockUserProfile: UserProfile = {
  id: "user123",
  name: "John Doe",
  email: "john.doe@example.com",
  portfolio: [
    {
      coinId: "bitcoin",
      amount: 0.5,
      valueUSD: 32716.39,
      averageBuyPrice: 60000,
      profitLoss: 2716.39,
      profitLossPercentage: 9.05,
    },
    {
      coinId: "ethereum",
      amount: 3.2,
      valueUSD: 11398.85,
      averageBuyPrice: 3200,
      profitLoss: 1159.65,
      profitLossPercentage: 11.32,
    },
    {
      coinId: "solana",
      amount: 25,
      valueUSD: 3594,
      averageBuyPrice: 120,
      profitLoss: 594,
      profitLossPercentage: 19.8,
    },
  ],
  balance: {
    available: 12547.83,
    locked: 2500,
  },
  watchlist: ["bitcoin", "ethereum", "solana", "cardano"],
  orders: [
    {
      id: "order1",
      type: "buy",
      coinId: "bitcoin",
      price: 65000,
      amount: 0.1,
      total: 6500,
      status: "filled",
      timestamp: Date.now() - 86400000,
    },
    {
      id: "order2",
      type: "sell",
      coinId: "ethereum",
      price: 3600,
      amount: 1.5,
      total: 5400,
      status: "open",
      timestamp: Date.now() - 43200000,
    },
  ],
};

// Generate random chart data for a given time range
const generateChartData = (days: number, volatility: number, startPrice: number): ChartData[] => {
  const data: ChartData[] = [];
  let currentPrice = startPrice;
  const now = Date.now();
  const interval = (days * 24 * 60 * 60 * 1000) / 100; // 100 data points

  for (let i = 0; i < 100; i++) {
    const timestamp = now - (100 - i) * interval;
    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice * 0.05;
    currentPrice += change;
    currentPrice = Math.max(currentPrice, startPrice * 0.5); // Ensure price doesn't go too low
    
    data.push({
      timestamp,
      price: currentPrice,
    });
  }

  return data;
};

// API functions
export const API = {
  // Get all coins
  getCoins: (): Promise<Coin[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockCoins);
      }, 500);
    });
  },
  
  // Get a specific coin by ID
  getCoin: (id: string): Promise<Coin | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const coin = mockCoins.find((c) => c.id === id);
        resolve(coin);
      }, 300);
    });
  },
  
  // Get chart data for a coin
  getCoinChartData: (id: string, days: number): Promise<ChartData[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const coin = mockCoins.find((c) => c.id === id);
        if (!coin) {
          resolve([]);
          return;
        }
        
        const volatility = coin.change24h / 100;
        const data = generateChartData(days, volatility, coin.price);
        resolve(data);
      }, 600);
    });
  },
  
  // Get user profile
  getUserProfile: (): Promise<UserProfile> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockUserProfile);
      }, 400);
    });
  },
};
