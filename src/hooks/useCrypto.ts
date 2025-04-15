
import { useState, useEffect, useCallback } from 'react';
import { Crypto, CryptoHistoryData, cryptoApi } from '../api/cryptoApi';
import { useToast } from '@/hooks/use-toast';

export function useCryptoData() {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCryptos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cryptoApi.getTopCryptos();
      setCryptos(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch cryptocurrency data');
      toast({
        title: 'Error',
        description: 'Failed to fetch cryptocurrency data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCryptos();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchCryptos, 30000);
    return () => clearInterval(interval);
  }, [fetchCryptos]);

  return { cryptos, loading, error, refreshData: fetchCryptos };
}

export function useCryptoHistory(cryptoId: string, days: number = 7) {
  const [historyData, setHistoryData] = useState<CryptoHistoryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!cryptoId) return;
      
      try {
        setLoading(true);
        const data = await cryptoApi.getCryptoHistory(cryptoId, days);
        setHistoryData(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch history data');
        toast({
          title: 'Error',
          description: 'Failed to fetch cryptocurrency history data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [cryptoId, days, toast]);

  return { historyData, loading, error };
}

export function useCryptoTrade() {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const { toast } = useToast();
  const { setPortfolio, portfolio } = usePortfolioState();

  const executeTrade = async (
    cryptoId: string,
    action: 'buy' | 'sell',
    amount: number
  ): Promise<boolean> => {
    setIsExecuting(true);
    try {
      const result = await cryptoApi.executeTrade(cryptoId, action, amount);
      
      if (result.success) {
        // Update the portfolio after successful trade
        const crypto = await cryptoApi.getCryptoById(cryptoId);
        
        if (crypto) {
          updatePortfolio(crypto, action, amount);
        }
      }
      
      return result.success;
    } catch (error) {
      toast({
        title: 'Trade Failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsExecuting(false);
    }
  };

  const updatePortfolio = (crypto: Crypto, action: 'buy' | 'sell', amount: number) => {
    const existingAsset = portfolio.find(asset => asset.cryptoId === crypto.id);
    const tradeValue = amount * crypto.currentPrice;
    
    if (existingAsset) {
      // Update existing asset
      const updatedPortfolio = portfolio.map(asset => {
        if (asset.cryptoId === crypto.id) {
          const newAmount = action === 'buy' 
            ? asset.amount + amount 
            : Math.max(0, asset.amount - amount);
            
          const newValueUSD = newAmount * crypto.currentPrice;
          
          // If amount becomes 0, remove the asset from portfolio
          if (newAmount === 0) {
            return null;
          }
          
          return {
            ...asset,
            amount: newAmount,
            valueUSD: newValueUSD,
            // Simple profit/loss calculation
            profitLoss: action === 'buy' ? asset.profitLoss : asset.profitLoss - (amount * crypto.currentPrice * 0.05),
            profitLossPercentage: action === 'buy' ? asset.profitLossPercentage : asset.profitLossPercentage - 2.5
          };
        }
        return asset;
      }).filter(Boolean) as PortfolioAsset[];
      
      setPortfolio(updatedPortfolio);
    } else if (action === 'buy') {
      // Add new asset to portfolio
      const newAsset: PortfolioAsset = {
        cryptoId: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol,
        amount: amount,
        valueUSD: tradeValue,
        image: crypto.image,
        profitLoss: 0, // Initial profit/loss is 0
        profitLossPercentage: 0
      };
      
      setPortfolio([...portfolio, newAsset]);
    }
  };

  return { executeTrade, isExecuting };
}

// Portfolio mock data
export interface PortfolioAsset {
  cryptoId: string;
  name: string;
  symbol: string;
  amount: number;
  valueUSD: number;
  image: string;
  profitLoss: number;
  profitLossPercentage: number;
}

// Portfolio state management
const portfolioInitialState: PortfolioAsset[] = [
  {
    cryptoId: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    amount: 0.5,
    valueUSD: 30617.28,
    image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    profitLoss: 1245.67,
    profitLossPercentage: 4.23
  },
  {
    cryptoId: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    amount: 3.2,
    valueUSD: 11061.70,
    image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    profitLoss: -320.45,
    profitLossPercentage: -2.81
  },
  {
    cryptoId: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    amount: 25,
    valueUSD: 3391.75,
    image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    profitLoss: 672.50,
    profitLossPercentage: 24.73
  }
];

let globalPortfolio = [...portfolioInitialState];
let portfolioListeners: ((portfolio: PortfolioAsset[]) => void)[] = [];

function usePortfolioState() {
  const [portfolio, setLocalPortfolio] = useState<PortfolioAsset[]>(globalPortfolio);
  
  useEffect(() => {
    const listener = (updatedPortfolio: PortfolioAsset[]) => {
      setLocalPortfolio(updatedPortfolio);
    };
    
    portfolioListeners.push(listener);
    
    return () => {
      portfolioListeners = portfolioListeners.filter(l => l !== listener);
    };
  }, []);
  
  const setPortfolio = (updatedPortfolio: PortfolioAsset[]) => {
    globalPortfolio = updatedPortfolio;
    portfolioListeners.forEach(listener => listener(globalPortfolio));
  };
  
  return { portfolio, setPortfolio };
}

export function usePortfolio() {
  const { portfolio } = usePortfolioState();
  
  const totalValue = portfolio.reduce((acc, asset) => acc + asset.valueUSD, 0);
  const totalProfitLoss = portfolio.reduce((acc, asset) => acc + asset.profitLoss, 0);
  const totalProfitLossPercentage = totalValue !== 0 
    ? (totalProfitLoss / (totalValue - totalProfitLoss)) * 100
    : 0;

  return { 
    portfolio, 
    totalValue, 
    totalProfitLoss, 
    totalProfitLossPercentage 
  };
}
