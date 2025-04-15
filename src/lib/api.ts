import { Coin, ChartData, UserProfile, PortfolioAsset, TradeOrder, DemoAccount, DemoPosition, DemoTrade, DemoPortfolioAsset } from "./types";
import axios from "axios";

// CoinCap API base URL
const COINCAP_API_URL = "https://api.coincap.io/v2";

// Helper function to convert CoinCap data to our app's Coin format
const formatCoinData = (coinData: any): Coin => {
  return {
    id: coinData.id || '',
    name: coinData.name || '',
    symbol: (coinData.symbol || '').toUpperCase(),
    price: parseFloat(coinData.priceUsd) || 0,
    change24h: parseFloat(coinData.changePercent24Hr) || 0,
    volume24h: parseFloat(coinData.volumeUsd24Hr) || 0,
    marketCap: parseFloat(coinData.marketCapUsd) || 0,
    image: `https://assets.coincap.io/assets/icons/${(coinData.symbol || '').toLowerCase()}@2x.png`,
    rank: parseInt(coinData.rank) || 0,
    supply: {
      circulating: parseFloat(coinData.supply) || 0,
      total: parseFloat(coinData.maxSupply) || 0,
      max: parseFloat(coinData.maxSupply) || null,
    },
  };
};

// Format timestamp to Unix timestamp in seconds
const formatTimestamp = (timestamp: number): number => {
  return Math.floor(timestamp / 1000);
};

// Demo trading service - manages local demo account data
export class DemoTradingService {
  private static instance: DemoTradingService;
  private demoAccount: DemoAccount;
  private readonly STORAGE_KEY = 'demo_trading_account';
  private readonly DEFAULT_BALANCE = 10000; // $10,000 initial virtual balance
  private readonly TRADING_FEE_RATE = 0.001; // 0.1% trading fee

  private constructor() {
    // Load demo account from local storage or create new one
    const savedAccount = localStorage.getItem(this.STORAGE_KEY);
    if (savedAccount) {
      this.demoAccount = JSON.parse(savedAccount);
    } else {
      this.demoAccount = {
        balance: this.DEFAULT_BALANCE,
        portfolio: [],
        openPositions: [],
        closedPositions: [],
        tradingHistory: []
      };
      this.saveAccount();
    }
  }

  public static getInstance(): DemoTradingService {
    if (!DemoTradingService.instance) {
      DemoTradingService.instance = new DemoTradingService();
    }
    return DemoTradingService.instance;
  }

  // Get demo account data
  public getAccount(): DemoAccount {
    return { ...this.demoAccount };
  }

  // Reset demo account
  public resetAccount(): DemoAccount {
    this.demoAccount = {
      balance: this.DEFAULT_BALANCE,
      portfolio: [],
      openPositions: [],
      closedPositions: [],
      tradingHistory: []
    };
    this.saveAccount();
    return { ...this.demoAccount };
  }

  // Update coin prices in portfolio and positions
  public async updatePrices(): Promise<void> {
    // Get all unique coin IDs from portfolio and positions
    const coinIds = new Set<string>();
    this.demoAccount.portfolio.forEach(asset => coinIds.add(asset.coinId));
    this.demoAccount.openPositions.forEach(position => coinIds.add(position.coinId));
    
    if (coinIds.size === 0) return;

    try {
      // Get current prices for all coins
      const response = await axios.get(`${COINCAP_API_URL}/assets`, {
        params: {
          limit: 50,
          ids: Array.from(coinIds).join(',')
        }
      });

      const priceMap = new Map<string, number>();
      response.data.data.forEach((coin: any) => {
        priceMap.set(coin.id, parseFloat(coin.priceUsd));
      });

      // Update portfolio
      this.demoAccount.portfolio = this.demoAccount.portfolio.map(asset => {
        const currentPrice = priceMap.get(asset.coinId) || asset.currentPrice;
        const valueUSD = asset.amount * currentPrice;
        const profitLoss = valueUSD - (asset.amount * asset.avgBuyPrice);
        const profitLossPercentage = (currentPrice / asset.avgBuyPrice - 1) * 100;

        return {
          ...asset,
          currentPrice,
          valueUSD,
          profitLoss,
          profitLossPercentage
        };
      });

      // Update open positions
      this.demoAccount.openPositions = this.demoAccount.openPositions.map(position => {
        const currentPrice = priceMap.get(position.coinId) || position.currentPrice;
        
        let profitLoss: number;
        let profitLossPercentage: number;
        
        if (position.type === 'long') {
          profitLoss = (currentPrice - position.entryPrice) * position.amount * position.leverage;
          profitLossPercentage = (currentPrice / position.entryPrice - 1) * 100 * position.leverage;
        } else { // short
          profitLoss = (position.entryPrice - currentPrice) * position.amount * position.leverage;
          profitLossPercentage = (position.entryPrice / currentPrice - 1) * 100 * position.leverage;
        }

        // Check if stop loss or take profit was hit
        let status = position.status;
        if (position.status === 'open') {
          if (position.takeProfit && 
              ((position.type === 'long' && currentPrice >= position.takeProfit) || 
               (position.type === 'short' && currentPrice <= position.takeProfit))) {
            status = 'closed';
            this.closePosition(position.id, position.takeProfit);
          } else if (position.stopLoss && 
                    ((position.type === 'long' && currentPrice <= position.stopLoss) || 
                     (position.type === 'short' && currentPrice >= position.stopLoss))) {
            status = 'closed';
            this.closePosition(position.id, position.stopLoss);
          }
        }

        return {
          ...position,
          currentPrice,
          profitLoss,
          profitLossPercentage,
          status
        };
      });

      this.saveAccount();
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }

  // Execute a buy order (spot trading)
  public async executeBuy(coinId: string, symbol: string, price: number, amount: number): Promise<DemoTrade> {
    const total = price * amount;
    const fee = total * this.TRADING_FEE_RATE;
    
    // Check if user has enough balance
    if (this.demoAccount.balance < total + fee) {
      throw new Error('Insufficient balance');
    }

    // Update balance
    this.demoAccount.balance -= (total + fee);

    // Check if coin already exists in portfolio
    const existingAssetIndex = this.demoAccount.portfolio.findIndex(asset => asset.coinId === coinId);
    
    if (existingAssetIndex !== -1) {
      // Update existing asset
      const existingAsset = this.demoAccount.portfolio[existingAssetIndex];
      const newTotalAmount = existingAsset.amount + amount;
      const newAvgPrice = ((existingAsset.amount * existingAsset.avgBuyPrice) + total) / newTotalAmount;
      
      this.demoAccount.portfolio[existingAssetIndex] = {
        ...existingAsset,
        amount: newTotalAmount,
        avgBuyPrice: newAvgPrice,
        currentPrice: price,
        valueUSD: newTotalAmount * price,
        profitLoss: 0,
        profitLossPercentage: 0
      };
    } else {
      // Add new asset to portfolio
      this.demoAccount.portfolio.push({
        coinId,
        symbol,
        amount,
        avgBuyPrice: price,
        currentPrice: price,
        valueUSD: total,
        profitLoss: 0,
        profitLossPercentage: 0
      });
    }

    // Record the trade
    const trade: DemoTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coinId,
      symbol,
      type: 'buy',
      price,
      amount,
      total,
      fee,
      timestamp: Date.now()
    };

    this.demoAccount.tradingHistory.unshift(trade);
    this.saveAccount();
    
    return trade;
  }

  // Execute a sell order (spot trading)
  public async executeSell(coinId: string, symbol: string, price: number, amount: number): Promise<DemoTrade> {
    // Check if user has the coin in portfolio
    const assetIndex = this.demoAccount.portfolio.findIndex(asset => asset.coinId === coinId);
    
    if (assetIndex === -1) {
      throw new Error('Asset not found in portfolio');
    }
    
    const asset = this.demoAccount.portfolio[assetIndex];
    
    // Check if user has enough of the coin
    if (asset.amount < amount) {
      throw new Error('Insufficient asset amount');
    }

    const total = price * amount;
    const fee = total * this.TRADING_FEE_RATE;
    
    // Update balance
    this.demoAccount.balance += (total - fee);

    // Update portfolio
    const newAmount = asset.amount - amount;
    
    if (newAmount > 0) {
      // Reduce amount
      this.demoAccount.portfolio[assetIndex] = {
        ...asset,
        amount: newAmount,
        currentPrice: price,
        valueUSD: newAmount * price,
        profitLoss: (price - asset.avgBuyPrice) * newAmount,
        profitLossPercentage: (price / asset.avgBuyPrice - 1) * 100
      };
    } else {
      // Remove asset from portfolio
      this.demoAccount.portfolio.splice(assetIndex, 1);
    }

    // Record the trade
    const trade: DemoTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coinId,
      symbol,
      type: 'sell',
      price,
      amount,
      total,
      fee,
      timestamp: Date.now()
    };

    this.demoAccount.tradingHistory.unshift(trade);
    this.saveAccount();
    
    return trade;
  }

  // Open a long position (margin trading)
  public async openLongPosition(
    coinId: string, 
    symbol: string, 
    price: number, 
    amount: number, 
    leverage: number,
    takeProfit?: number,
    stopLoss?: number
  ): Promise<DemoPosition> {
    const total = price * amount;
    const marginRequired = total / leverage;
    const fee = total * this.TRADING_FEE_RATE;
    
    // Check if user has enough balance for margin
    if (this.demoAccount.balance < marginRequired + fee) {
      throw new Error('Insufficient balance for margin');
    }

    // Update balance
    this.demoAccount.balance -= (marginRequired + fee);

    // Create position
    const position: DemoPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coinId,
      symbol,
      type: 'long',
      entryPrice: price,
      currentPrice: price,
      amount,
      leverage,
      openTime: Date.now(),
      takeProfit,
      stopLoss,
      profitLoss: 0,
      profitLossPercentage: 0,
      status: 'open',
      timestamp: Date.now()
    };

    // Add to open positions
    this.demoAccount.openPositions.push(position);

    // Record the trade
    const trade: DemoTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coinId,
      symbol,
      type: 'open_long',
      price,
      amount,
      total: marginRequired,
      fee,
      timestamp: Date.now(),
      positionId: position.id
    };

    this.demoAccount.tradingHistory.unshift(trade);
    this.saveAccount();
    
    return position;
  }

  // Open a short position (margin trading)
  public async openShortPosition(
    coinId: string, 
    symbol: string, 
    price: number, 
    amount: number, 
    leverage: number,
    takeProfit?: number,
    stopLoss?: number
  ): Promise<DemoPosition> {
    const total = price * amount;
    const marginRequired = total / leverage;
    const fee = total * this.TRADING_FEE_RATE;
    
    // Check if user has enough balance for margin
    if (this.demoAccount.balance < marginRequired + fee) {
      throw new Error('Insufficient balance for margin');
    }

    // Update balance
    this.demoAccount.balance -= (marginRequired + fee);

    // Create position
    const position: DemoPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coinId,
      symbol,
      type: 'short',
      entryPrice: price,
      currentPrice: price,
      amount,
      leverage,
      openTime: Date.now(),
      takeProfit,
      stopLoss,
      profitLoss: 0,
      profitLossPercentage: 0,
      status: 'open',
      timestamp: Date.now()
    };

    // Add to open positions
    this.demoAccount.openPositions.push(position);

    // Record the trade
    const trade: DemoTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coinId,
      symbol,
      type: 'open_short',
      price,
      amount,
      total: marginRequired,
      fee,
      timestamp: Date.now(),
      positionId: position.id
    };

    this.demoAccount.tradingHistory.unshift(trade);
    this.saveAccount();
    
    return position;
  }

  // Close a position (margin trading)
  public async closePosition(positionId: string, closePrice?: number): Promise<DemoPosition> {
    // Find position
    const positionIndex = this.demoAccount.openPositions.findIndex(pos => pos.id === positionId);
    
    if (positionIndex === -1) {
      throw new Error('Position not found');
    }
    
    const position = this.demoAccount.openPositions[positionIndex];
    
    // Calculate profit/loss
    if (!closePrice) {
      closePrice = position.currentPrice;
    }
    
    let profitLoss: number;
    
    if (position.type === 'long') {
      profitLoss = (closePrice - position.entryPrice) * position.amount * position.leverage;
    } else { // short
      profitLoss = (position.entryPrice - closePrice) * position.amount * position.leverage;
    }
    
    const profitLossPercentage = (profitLoss / (position.entryPrice * position.amount / position.leverage)) * 100;
    
    // Calculate fee
    const total = closePrice * position.amount;
    const fee = total * this.TRADING_FEE_RATE;
    
    // Update balance (return margin + profit or - loss)
    const marginAmount = position.entryPrice * position.amount / position.leverage;
    this.demoAccount.balance += marginAmount + profitLoss - fee;
    
    // Update position
    const closedPosition: DemoPosition = {
      ...position,
      currentPrice: closePrice,
      closeTime: Date.now(),
      profitLoss,
      profitLossPercentage,
      status: 'closed'
    };
    
    // Remove from open positions and add to closed positions
    this.demoAccount.openPositions.splice(positionIndex, 1);
    this.demoAccount.closedPositions.unshift(closedPosition);
    
    // Record the trade
    const trade: DemoTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      coinId: position.coinId,
      symbol: position.symbol,
      type: position.type === 'long' ? 'close_long' : 'close_short',
      price: closePrice,
      amount: position.amount,
      total,
      fee,
      timestamp: Date.now(),
      positionId: position.id
    };
    
    this.demoAccount.tradingHistory.unshift(trade);
    this.saveAccount();
    
    return closedPosition;
  }

  // Get real-time OHLC data for intraday trading
  public async getIntradayChartData(coinId: string, interval: string): Promise<any[]> {
    try {
      const response = await axios.get(`${COINCAP_API_URL}/assets/${coinId}/history`, {
        params: { interval }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching intraday data for ${coinId}:`, error);
      throw error;
    }
  }

  // Save account data to localStorage
  private saveAccount(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.demoAccount));
  }
}

// Initialize demo trading service
export const demoTrading = DemoTradingService.getInstance();

// API functions
export const API = {
  // Get all supported coins
  getCoins: async (): Promise<Coin[]> => {
    try {
      const response = await axios.get(`${COINCAP_API_URL}/assets`, {
        params: {
          limit: 50  // Get top 50 coins
        }
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid data format from API');
      }
      
      return response.data.data.map(formatCoinData);
    } catch (error) {
      console.error("Error fetching coins:", error);
      throw error;
    }
  },

  // Get a specific coin by ID
  getCoin: async (id: string): Promise<Coin | undefined> => {
    try {
      const response = await axios.get(`${COINCAP_API_URL}/assets/${id}`);
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid data format from API');
      }
      
      return formatCoinData(response.data.data);
    } catch (error) {
      console.error(`Error fetching coin ${id}:`, error);
      throw error;
    }
  },

  // Get historical price data for a coin
  getHistoricalData: async (coinId: string, interval: string = '1d'): Promise<any[]> => {
    try {
      // Convert interval to milliseconds
      const intervalMs = 
        interval === '5m' ? 5 * 60 * 1000 :
        interval === '1h' ? 60 * 60 * 1000 :
        interval === '4h' ? 4 * 60 * 60 * 1000 :
        24 * 60 * 60 * 1000; // 1d default

      // Calculate start and end time
      const end = Date.now();
      const start = end - (100 * intervalMs); // Get 100 data points

      const response = await axios.get(`${COINCAP_API_URL}/assets/${coinId}/history`, {
        params: {
          interval: interval === '1d' ? 'd1' : 
                   interval === '1h' ? 'h1' : 
                   interval === '5m' ? 'm5' : 'h1',
          start,
          end
        }
      });

      if (!response.data || !response.data.data) {
        throw new Error('Invalid data format from API');
      }

      // Transform data for the chart
      return response.data.data.map((item: any) => ({
        time: formatTimestamp(item.time),
        value: parseFloat(item.priceUsd)
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${coinId}:`, error);
      throw error;
    }
  },

  // Get user profile
  getUserProfile: async (): Promise<UserProfile> => {
    try {
      const response = await axios.get(`${COINCAP_API_URL}/users/profile`);
      return response.data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  },

  // Get user portfolio
  getPortfolio: async (): Promise<PortfolioAsset[]> => {
    try {
      const response = await axios.get(`${COINCAP_API_URL}/users/portfolio`);
      return response.data;
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      throw error;
    }
  },

  // Get user's watchlist
  getWatchlist: async (): Promise<string[]> => {
    try {
      const response = await axios.get(`${COINCAP_API_URL}/users/watchlist`);
      return response.data;
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      throw error;
    }
  },

  // Get user's order history
  getOrderHistory: async (): Promise<TradeOrder[]> => {
    try {
      const response = await axios.get(`${COINCAP_API_URL}/users/orders`);
      return response.data;
    } catch (error) {
      console.error("Error fetching order history:", error);
      throw error;
    }
  },

  // Update user's watchlist
  updateWatchlist: async (coinIds: string[]): Promise<string[]> => {
    try {
      const response = await axios.put(`${COINCAP_API_URL}/users/watchlist`, { coinIds });
      return response.data;
    } catch (error) {
      console.error("Error updating watchlist:", error);
      throw error;
    }
  },

  // Trading service for demo account
  DemoTrading: {
    // Get intraday chart data
    getIntradayChartData: async (coinId: string, interval: string): Promise<any[]> => {
      try {
        // Convert interval to milliseconds
        const intervalMs = 
          interval === '5m' ? 5 * 60 * 1000 :
          interval === '1h' ? 60 * 60 * 1000 :
          interval === '4h' ? 4 * 60 * 60 * 1000 :
          24 * 60 * 60 * 1000; // 1d default

        // Calculate start and end time
        const end = Date.now();
        const start = end - (100 * intervalMs); // Get 100 data points

        const response = await axios.get(`${COINCAP_API_URL}/assets/${coinId}/history`, {
          params: {
            interval: interval === '1d' ? 'd1' : 
                     interval === '1h' ? 'h1' : 
                     interval === '5m' ? 'm5' : 'h1',
            start,
            end
          }
        });

        if (!response.data || !response.data.data) {
          throw new Error('Invalid data format from API');
        }

        // Transform data into OHLC format
        const data = response.data.data;
        const ohlcData = [];
        
        for (let i = 0; i < data.length - 1; i++) {
          const currentPrice = parseFloat(data[i].priceUsd);
          const nextPrice = parseFloat(data[i + 1].priceUsd);
          const time = formatTimestamp(data[i].time);
          
          // Generate OHLC data
          const open = currentPrice;
          const close = nextPrice;
          const high = Math.max(currentPrice, nextPrice) * (1 + Math.random() * 0.002); // Add small randomness
          const low = Math.min(currentPrice, nextPrice) * (1 - Math.random() * 0.002); // Add small randomness
          const volume = parseFloat(data[i].volumeUsd) || Math.random() * 1000;
          
          ohlcData.push({
            time,
            open,
            high,
            low,
            close,
            volume
          });
        }

        return ohlcData;
      } catch (error) {
        console.error(`Error fetching intraday data for ${coinId}:`, error);
        return [];
      }
    },

    // Get demo account status
    getDemoAccount: async (): Promise<DemoAccount> => {
      // For now, we'll store demo account data in localStorage
      const account = localStorage.getItem('demoAccount');
      if (account) {
        return JSON.parse(account);
      }

      // Initialize new demo account
      const newAccount: DemoAccount = {
        balance: 10000, // Start with $10,000
        portfolio: [],
        openPositions: [],
        closedPositions: [],
        tradingHistory: []
      };

      localStorage.setItem('demoAccount', JSON.stringify(newAccount));
      return newAccount;
    },

    // Close a demo position
    closeDemoPosition: async (positionId: string): Promise<DemoPosition> => {
      try {
        const account = await API.DemoTrading.getDemoAccount();
        const position = account.openPositions.find(p => p.id === positionId);

        if (!position) {
          throw new Error('Position not found');
        }

        // Get current price
        const response = await API.getCoin(position.coinId);
        if (!response) {
          throw new Error('Could not get current price');
        }

        const currentPrice = response.price;
        position.currentPrice = currentPrice;
        position.status = 'closed';

        // Calculate P&L
        const priceDiff = currentPrice - position.entryPrice;
        position.profitLoss = priceDiff * position.amount * position.leverage;
        position.profitLossPercentage = (priceDiff / position.entryPrice) * 100 * position.leverage;

        // Update account
        account.balance += (position.amount * currentPrice) + position.profitLoss;
        account.openPositions = account.openPositions.filter(p => p.id !== positionId);
        account.closedPositions.push(position);

        localStorage.setItem('demoAccount', JSON.stringify(account));
        return position;
      } catch (error) {
        console.error("Error closing demo position:", error);
        throw error;
      }
    },

    // Reset demo account
    resetDemoAccount: async (): Promise<DemoAccount> => {
      const newAccount: DemoAccount = {
        balance: 10000,
        portfolio: [],
        openPositions: [],
        closedPositions: [],
        tradingHistory: []
      };

      localStorage.setItem('demoAccount', JSON.stringify(newAccount));
      return newAccount;
    }
  },

  // Get intraday data for fixed-time trading
  getIntradayData: async (coinId: string, interval: string): Promise<any[]> => {
    try {
      // Convert interval to seconds for CoinCap API
      const intervalMap: { [key: string]: number } = {
        '30s': 30,
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '30m': 1800,
        '1h': 3600
      };

      const now = Date.now();
      const start = now - 24 * 60 * 60 * 1000; // Last 24 hours
      
      const response = await axios.get(`${COINCAP_API_URL}/assets/${coinId}/history`, {
        params: {
          interval: 'm1', // CoinCap only supports m1, m5, m15, m30, h1, h2, h6, h12, d1
          start,
          end: now
        }
      });

      if (!response.data?.data) {
        throw new Error('No data received from CoinCap API');
      }

      // Transform data for candlestick chart
      const data = response.data.data;
      const candlestickData = [];
      
      // Group data by intervals
      for (let i = 0; i < data.length - 1; i++) {
        const price = parseFloat(data[i].priceUsd);
        const nextPrice = parseFloat(data[i + 1].priceUsd);
        const time = Math.floor(data[i].time / 1000) as number;
        
        // Generate OHLC data with some randomness to make it look more realistic
        const open = price;
        const close = nextPrice;
        const high = Math.max(price, nextPrice) * (1 + Math.random() * 0.001);
        const low = Math.min(price, nextPrice) * (1 - Math.random() * 0.001);
        const volume = parseFloat(data[i].volumeUsd) || Math.random() * 1000;
        
        candlestickData.push({
          time,
          open,
          high,
          low,
          close,
          volume
        });
      }

      return candlestickData;
    } catch (error) {
      console.error('Error fetching intraday data:', error);
      return [];
    }
  },

  // Update demo account prices
  updateDemoPrices: async (): Promise<void> => {
    try {
      const account = await API.DemoTrading.getDemoAccount();
      if (!account) return;

      // Update portfolio assets prices
      for (const asset of account.portfolio) {
        const coinData = await API.getCoin(asset.coinId);
        if (coinData) {
          asset.currentPrice = coinData.price;
          asset.valueUSD = asset.amount * coinData.price;
          asset.profitLoss = asset.valueUSD - (asset.amount * asset.avgBuyPrice);
          asset.profitLossPercentage = ((asset.currentPrice - asset.avgBuyPrice) / asset.avgBuyPrice) * 100;
        }
      }

      // Update open positions
      for (const position of account.openPositions) {
        const coinData = await API.getCoin(position.coinId);
        if (coinData) {
          position.currentPrice = coinData.price;
          const priceDiff = position.type === 'long' 
            ? position.currentPrice - position.entryPrice
            : position.entryPrice - position.currentPrice;
          position.profitLoss = priceDiff * position.amount * position.leverage;
          position.profitLossPercentage = (priceDiff / position.entryPrice) * 100 * position.leverage;

          // Check take profit and stop loss
          if (position.takeProfit && position.type === 'long' && position.currentPrice >= position.takeProfit) {
            await API.DemoTrading.closeDemoPosition(position.id);
          }
          if (position.takeProfit && position.type === 'short' && position.currentPrice <= position.takeProfit) {
            await API.DemoTrading.closeDemoPosition(position.id);
          }
          if (position.stopLoss && position.type === 'long' && position.currentPrice <= position.stopLoss) {
            await API.DemoTrading.closeDemoPosition(position.id);
          }
          if (position.stopLoss && position.type === 'short' && position.currentPrice >= position.stopLoss) {
            await API.DemoTrading.closeDemoPosition(position.id);
          }
        }
      }

      localStorage.setItem('demoAccount', JSON.stringify(account));
    } catch (error) {
      console.error('Error updating demo prices:', error);
    }
  }
};
