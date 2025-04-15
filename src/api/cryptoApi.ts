import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';
import axios from 'axios';

export interface Crypto {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  priceChangePercentage24h: number;
  image: string;
  marketCap: number;
  volume24h: number;
}

export interface CryptoHistoryData {
  timestamp: number;
  price: number;
}

// Initialize Coinbase SDK with environment variables for sandbox/test environment
const initializeCoinbase = async () => {
  const response = await axios.get('/api/config/coinbase');
  if (response.data && response.data.apiKey) {
    // Configure SDK with sandbox API keys
    Coinbase.configureFromJson(response.data.apiKey);
    return true;
  }
  return false;
};

// Real Coinbase API implementation (using sandbox/test environment)
export const cryptoApi = {
  // Get list of top cryptocurrencies
  getTopCryptos: async (): Promise<Crypto[]> => {
    try {
      await initializeCoinbase();
      // Use Base Sepolia testnet instead of mainnet for demo trading
      const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseSepolia });
      const assets = await wallet.listAssets();
      
      return assets.map(asset => ({
        id: asset.id.toLowerCase(),
        name: asset.name,
        symbol: asset.symbol,
        currentPrice: asset.price || 0,
        priceChangePercentage24h: asset.priceChange24h || 0,
        image: asset.image || `https://assets.coingecko.com/coins/images/1/small/${asset.symbol.toLowerCase()}.png`,
        marketCap: asset.marketCap || 0,
        volume24h: asset.volume24h || 0
      }));
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      throw error;
    }
  },
  
  // Get data for a specific crypto
  getCryptoById: async (id: string): Promise<Crypto | undefined> => {
    try {
      await initializeCoinbase();
      // Use Base Sepolia testnet
      const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseSepolia });
      const asset = await wallet.getAsset(id);
      
      if (!asset) return undefined;
      
      return {
        id: asset.id.toLowerCase(),
        name: asset.name,
        symbol: asset.symbol,
        currentPrice: asset.price || 0,
        priceChangePercentage24h: asset.priceChange24h || 0,
        image: asset.image || `https://assets.coingecko.com/coins/images/1/small/${asset.symbol.toLowerCase()}.png`,
        marketCap: asset.marketCap || 0,
        volume24h: asset.volume24h || 0
      };
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      throw error;
    }
  },
  
  // Get historical data for a cryptocurrency
  getCryptoHistory: async (id: string, days: number = 7): Promise<CryptoHistoryData[]> => {
    try {
      await initializeCoinbase();
      // Use Base Sepolia testnet
      const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseSepolia });
      const history = await wallet.getAssetPriceHistory(id, {
        interval: 'hour',
        duration: `${days}d`
      });
      
      return history.map(point => ({
        timestamp: point.timestamp,
        price: point.price
      }));
    } catch (error) {
      console.error('Error fetching crypto history:', error);
      throw error;
    }
  },
  
  // Demo trading implementation using Coinbase SDK sandbox
  executeTrade: async (
    cryptoId: string, 
    action: 'buy' | 'sell', 
    amount: number
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await initializeCoinbase();
      // Use Base Sepolia testnet for demo trading
      const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseSepolia });
      
      const trade = await wallet.createTrade({
        amount: amount,
        fromAssetId: action === 'sell' ? cryptoId : 'USD',
        toAssetId: action === 'buy' ? cryptoId : 'USD'
      });

      await trade.wait();
      const status = await trade.getStatus();

      return {
        success: status === 'completed',
        message: status === 'completed' 
          ? `Demo ${action === 'buy' ? 'purchased' : 'sold'} ${amount} of ${cryptoId} (Test Environment)`
          : `Demo trade failed with status: ${status}`
      };
    } catch (error) {
      console.error('Error executing demo trade:', error);
      return {
        success: false,
        message: error.message || 'Demo trade failed'
      };
    }
  }
};
