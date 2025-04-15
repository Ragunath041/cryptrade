import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  createChart,
  ColorType,
  IChartApi,
  Time,
  ISeriesApi,
  SeriesType,
  LineData,
  CandlestickData as LightweightCandlestickData,
  CrosshairMode,
  PriceScaleMode
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowUp, ArrowDown, Clock, PlusCircle, MinusCircle, 
  LineChart as LineIcon, CandlestickChartIcon, User,
  Wallet, Activity, BarChart3, Settings, Home
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import TradingHistory from '@/pages/TradingHistory';

interface CryptoTradingViewProps {
  initialBalance?: number;
}

interface OutletContextType {
  selectedCoin: string;
}

// Define proper types for chart data
interface AreaChartData {
  time: Time;
  value: number;
}

interface CandlestickData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Trade type
interface Trade {
  id: string;
  amount: number;
  direction: 'UP' | 'DOWN';
  entryPrice: number;
  duration: number; // in seconds
  timeLeft: number; // in seconds
  status: 'active' | 'won' | 'lost';
  profit?: number;
  entryTime?: number; // Unix timestamp
  expiryTime?: number; // Unix timestamp
  entryLine?: ISeriesApi<'Line'>;
  expiryLine?: ISeriesApi<'Line'>;
}

// Union type for both series types
type ChartSeries = ISeriesApi<SeriesType>;

// Available time options
const timeOptions = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 }
];

// Add a new interface for trade markers
interface TradeMarker {
  id: string;
  time: Time;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown';
  text: string;
}

// Add a new interface for completed trades history
interface TradeHistory {
  id: string;
  date: Date;
  crypto: string; 
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  status: 'completed' | 'pending' | 'failed';
}

// Add a helper function to load trades from localStorage
const loadTradesFromStorage = (): TradeHistory[] => {
  try {
    const savedTrades = localStorage.getItem('trading_history');
    if (savedTrades) {
      const parsed = JSON.parse(savedTrades);
      return parsed.map((trade: Omit<TradeHistory, 'date'> & { date: string }) => ({
        ...trade,
        date: new Date(trade.date)
      }));
    }
  } catch (error) {
    console.error('Error loading trades from storage:', error);
  }
  return [];
};

interface BinaryOptionTradeAPI {
  id: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  entry_price: number;
  exit_price: number | null;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'EXPIRED';
  payout_amount: number | null;
  created_at: string;
  expiry_time: string;
  expiry_seconds: number;
}

// Add API service for binary options trades
const binaryOptionsApi = {
  createTrade: async (tradeData: {
    symbol: string;
    direction: 'UP' | 'DOWN';
    amount: number;
    expiry_seconds: number;
    entry_price?: number; // Make entry_price optional
  }): Promise<BinaryOptionTradeAPI> => {
    try {
      // Get auth token from local storage
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        // For demo purposes, just return a mock response if no token
        return {
          id: `mock-${Date.now()}`,
          symbol: tradeData.symbol,
          direction: tradeData.direction,
          amount: tradeData.amount,
          entry_price: tradeData.entry_price || 0, // Use provided entry price
          exit_price: null,
          status: 'ACTIVE',
          payout_amount: null,
          created_at: new Date().toISOString(),
          expiry_time: new Date(Date.now() + tradeData.expiry_seconds * 1000).toISOString(),
          expiry_seconds: tradeData.expiry_seconds
        };
      }
      
      // Create a proper request payload that includes entry_price
      const payload = {
        ...tradeData,
        entry_price: tradeData.entry_price || 0 // Ensure entry_price is included
      };
      
      const response = await axios.post('/api/binary-options/', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating trade:', error);
      throw error;
    }
  },
};

// Add API service to fetch trade history
const tradeHistoryApi = {
  getAllTrades: async (): Promise<BinaryOptionTradeAPI[]> => {
    try {
      // Get auth token from local storage
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('No authentication token found');
        // Returning empty array is better than throwing an error in this case
        return [];
      }
      
      const response = await axios.get('/api/binary-options/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching all trades:', error);
      
      // Check if error is due to authentication
      if (error.response && error.response.status === 401) {
        console.error('Authentication error when fetching trades');
      }
      
      // Re-throw to let component handle the error
      throw error;
    }
  }
};

const CryptoTradingView: React.FC<CryptoTradingViewProps> = ({ initialBalance = 10000 }) => {
  const { selectedCoin } = useOutletContext<OutletContextType>();
  const location = useLocation();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(location.pathname.includes('/history'));
  const [assetInfo, setAssetInfo] = useState({
    name: 'Bitcoin',
    symbol: 'BTC',
    change: '+0.8%'
  });
  const [amount, setAmount] = useState(70); // Minimum amount is 70
  const [selectedTimeOption, setSelectedTimeOption] = useState(timeOptions[2]); // Default 1m
  const [balance, setBalance] = useState(initialBalance);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [chartType, setChartType] = useState<'area' | 'candle'>('area');
  const [timeFrame, setTimeFrame] = useState<'1m' | '5m' | '15m' | '1h' | '1d'>('1m');
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>(() => loadTradesFromStorage());
  const { toast } = useToast();
  const [backendTrades, setBackendTrades] = useState<BinaryOptionTradeAPI[]>([]);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ChartSeries | null>(null);
  
  // Add new state for tab selection
  const [durationTab, setDurationTab] = useState<'timer' | 'clock'>('timer');
  
  // Add effect to listen for URL changes
  useEffect(() => {
    // Check if the URL includes '/history' to determine if we should show trading history
    setShowHistory(location.pathname.includes('/history'));
  }, [location.pathname]);
  
  // Initialize chart
  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      try {
        const container = chartContainerRef.current;
        
        // Create a chart with enhanced styling
        const chart = createChart(container, {
          width: container.clientWidth,
          height: container.clientHeight,
          layout: {
            background: { 
              type: ColorType.Solid, 
              color: '#0c0c0c' 
            },
            textColor: '#9ca3af',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          grid: {
            vertLines: {
              color: 'rgba(42, 46, 57, 0.3)',
              style: 1,
              visible: true,
            },
            horzLines: {
              color: 'rgba(42, 46, 57, 0.3)',
              style: 1,
              visible: true,
            },
          },
          timeScale: {
            borderColor: 'rgba(42, 46, 57, 0.3)',
            timeVisible: true,
            secondsVisible: true,
            borderVisible: true,
          },
          rightPriceScale: {
            borderColor: 'rgba(42, 46, 57, 0.3)',
            scaleMargins: {
              top: 0.1,
              bottom: 0.2,
            },
            mode: PriceScaleMode.Normal,
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              width: 1,
              color: 'rgba(80, 116, 204, 0.5)',
              style: 1,
              visible: true,
              labelVisible: false,
            },
            horzLine: {
              width: 1,
              color: 'rgba(80, 116, 204, 0.5)',
              style: 1,
              visible: true,
              labelVisible: true,
            },
          },
          handleScroll: true,
          handleScale: true,
        });
        
        // Store chart reference
        chartRef.current = chart;
        
        // Handle resize
        const handleResize = () => {
          if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ 
              width: chartContainerRef.current.clientWidth,
              height: chartContainerRef.current.clientHeight
            });
            chartRef.current.timeScale().fitContent();
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error("Error initializing chart:", error);
        toast({
          title: "Chart Error",
          description: "Could not initialize chart. Please try refreshing.",
          variant: "destructive"
        });
      }
    }
  }, []);
  
  // Separate useEffect to update chart data when chartType or timeFrame changes
  useEffect(() => {
    if (chartRef.current && chartContainerRef.current) {
      try {
        // Remove old series if it exists
        if (seriesRef.current) {
          chartRef.current.removeSeries(seriesRef.current);
          seriesRef.current = null;
        }
        
        // Determine how many data points and interval based on timeframe
        let dataPoints = 50;
        let interval = 60; // seconds
        
        switch (timeFrame) {
          case '1m':
            dataPoints = 60;
            interval = 60; // 60 seconds
            break;
          case '5m':
            dataPoints = 60;
            interval = 300; // 5 minutes
            break;
          case '15m':
            dataPoints = 60;
            interval = 900; // 15 minutes
            break;
          case '1h':
            dataPoints = 48;
            interval = 3600; // 1 hour
            break;
          case '1d':
            dataPoints = 30;
            interval = 86400; // 1 day
            break;
        }
        
        // Generate sample data
        const basePrice = selectedCoin.includes('BTC') ? 42000 : 
                           selectedCoin.includes('ETH') ? 2500 : 
                           selectedCoin.includes('SOL') ? 100 : 
                           selectedCoin.includes('DOGE') ? 0.1 : 100;
        
        const now = Math.floor(Date.now() / 1000);
        const data = [];
        
        // Generate sample data
        for (let i = 0; i < dataPoints; i++) {
          const timeValue = now - (dataPoints - 1 - i) * interval; // Interval based on timeframe
          const volatility = basePrice * 0.005 * Math.sqrt(interval / 60); // Scale volatility by timeframe
          const randomChange = (Math.random() - 0.48) * volatility;
          const price = basePrice + randomChange * (i / 2);
          
          if (chartType === 'area') {
            data.push({
              time: timeValue as Time,
              value: price
            } as LineData);
          } else {
            // For candlestick chart
            const open = price;
            const close = price * (1 + (Math.random() - 0.5) * 0.01 * Math.sqrt(interval / 60));
            const high = Math.max(open, close) * (1 + Math.random() * 0.005 * Math.sqrt(interval / 60));
            const low = Math.min(open, close) * (1 - Math.random() * 0.005 * Math.sqrt(interval / 60));
            
            data.push({
              time: timeValue as Time,
              open,
              high,
              low,
              close
            } as LightweightCandlestickData);
          }
        }
        
        // Create the appropriate series based on chartType
        if (chartType === 'area') {
          const areaSeries = chartRef.current.addAreaSeries({
            lineColor: '#0bdfbe',
            topColor: 'rgba(11, 223, 190, 0.4)',
            bottomColor: 'rgba(11, 223, 190, 0.05)',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: true,
            lastPriceAnimation: 1,
          });
          
          // Add the data
          areaSeries.setData(data as LineData[]);
          
          // Store the series
          seriesRef.current = areaSeries;
          
          // Set the last price
          if (data.length > 0) {
            setCurrentPrice((data[data.length - 1] as LineData).value);
          }
        } else {
          const candleSeries = chartRef.current.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: true,
            lastPriceAnimation: 1,
          });
          
          // Add the data
          candleSeries.setData(data as LightweightCandlestickData[]);
          
          // Store the series
          seriesRef.current = candleSeries;
          
          // Set the last price
          if (data.length > 0) {
            setCurrentPrice((data[data.length - 1] as LightweightCandlestickData).close);
          }
        }
        
        // Fit the content
        chartRef.current.timeScale().fitContent();
        
        // Re-apply any active trade markers
        if (activeTrades.length > 0 && seriesRef.current.markers) {
          const markers = activeTrades.map(trade => ({
            time: (trade.entryTime || Math.floor(Date.now() / 1000)) as Time,
            position: trade.direction === 'UP' ? 'belowBar' : 'aboveBar',
            color: trade.direction === 'UP' ? '#22c55e' : '#ef4444',
            shape: trade.direction === 'UP' ? 'arrowUp' : 'arrowDown',
            text: 'D1',
            id: trade.id
          }));
          
          seriesRef.current.setMarkers(markers);
        }
      } catch (error) {
        console.error("Error updating chart:", error);
      }
    }
  }, [selectedCoin, chartType, timeFrame]);
  
  // Clean up chart resources when component unmounts
  useEffect(() => {
      return () => {
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        }
      };
  }, []);
  
  // Update asset info when selected coin changes
  useEffect(() => {
    if (selectedCoin) {
      // Extract name and symbol from the selectedCoin format (e.g. "BTC-USD")
      const [symbol] = selectedCoin.split('-');
      const coinInfo = {
        'BTC': { name: 'Bitcoin', change: '+1.2%' },
        'ETH': { name: 'Ethereum', change: '+0.5%' },
        'SOL': { name: 'Solana', change: '+2.1%' },
        'DOGE': { name: 'Dogecoin', change: '-0.4%' },
        'ADA': { name: 'Cardano', change: '+0.3%' },
        'XRP': { name: 'Ripple', change: '-0.7%' },
        'DOT': { name: 'Polkadot', change: '+1.8%' },
        'SHIB': { name: 'Shiba Inu', change: '+3.2%' },
      }[symbol] || { name: symbol, change: '+0.0%' };
      
      setAssetInfo({
        name: coinInfo.name,
        symbol: symbol,
        change: coinInfo.change
      });
      
      // Start real-time updates when the chart is ready
      if (seriesRef.current) {
        fetchRealTimePrice();
      }
    }
  }, [selectedCoin, seriesRef.current]);
  
  // Update trade timers
  useEffect(() => {
    // Only run this timer if we have active trades
    if (activeTrades.length === 0) return;
    
    const timer = setInterval(() => {
      setActiveTrades(prevTrades => {
        const updatedTrades = prevTrades.map(trade => {
          // If trade is already completed, don't update it
          if (trade.status !== 'active') return trade;
          
          const newTimeLeft = trade.timeLeft - 1;
          
          // If time is up, determine if trade is won or lost
          if (newTimeLeft <= 0) {
            // Determine profit/loss based on current price and direction
            const isWon = (trade.direction === 'UP' && currentPrice > trade.entryPrice) || 
                          (trade.direction === 'DOWN' && currentPrice < trade.entryPrice);
            
            // Calculate profit (90% return on winning, lose 100% on losing)
            const profit = isWon ? trade.amount * 0.9 : -trade.amount;
            
            // Update balance
            setBalance(prev => prev + (isWon ? trade.amount + profit : 0));
            
            // Add to trade history
            const completionDate = new Date();
            const newHistoryEntry: TradeHistory = {
              id: `${trade.id}-${completionDate.getTime()}`,
              date: completionDate,
              crypto: selectedCoin.split('-')[0] || 'BTC',
              action: trade.direction === 'UP' ? 'buy' : 'sell',
              amount: trade.amount,
              price: trade.entryPrice,
              total: trade.amount * trade.entryPrice,
              status: isWon ? 'completed' : 'failed'
            };
            
            setTradeHistory(prev => {
              const updatedHistory = [newHistoryEntry, ...prev];
              // Save to localStorage right away in case the component unmounts
              localStorage.setItem('trading_history', JSON.stringify(updatedHistory));
              return updatedHistory;
            });
            
            // Update the marker if it exists to show result
            if (seriesRef.current && seriesRef.current.markers) {
              try {
                // Get existing markers
                const existingMarkers = seriesRef.current.markers() || [];
                
                // Find the trade's marker
                const markerIndex = existingMarkers.findIndex(m => m.id === trade.id);
                
                if (markerIndex >= 0) {
                  // Update marker to show result
                  const updatedMarkers = [...existingMarkers];
                  updatedMarkers[markerIndex] = {
                    ...updatedMarkers[markerIndex],
                    color: isWon ? '#22c55e' : '#ef4444',
                    text: isWon ? 'WIN' : 'LOSS',
                  };
                  
                  // Apply the updated markers
                  seriesRef.current.setMarkers(updatedMarkers);
                }
              } catch (error) {
                console.error("Error updating trade markers:", error);
              }
            }
            
            // Show toast notification with price comparison
            toast({
              title: isWon ? "Trade Won! 🎉" : "Trade Lost",
              description: isWon 
                ? `You earned ${formatCurrency(profit)} on your ${formatCurrency(trade.amount)} investment! Entry: ${formatPrice(trade.entryPrice)}, Exit: ${formatPrice(currentPrice)}`
                : `You lost your ${formatCurrency(trade.amount)} investment. Entry: ${formatPrice(trade.entryPrice)}, Exit: ${formatPrice(currentPrice)}`,
              variant: isWon ? "default" : "destructive"
            });
            
            return {
              ...trade,
              timeLeft: 0,
              status: isWon ? 'won' : 'lost',
              profit
            };
          }
          
          // Otherwise just update the time left
          return {
            ...trade,
            timeLeft: newTimeLeft
          };
        });
        
        return updatedTrades;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeTrades, currentPrice, toast, selectedCoin]);
  
  // Add effect to save current price to localStorage
  useEffect(() => {
    if (currentPrice > 0) {
      localStorage.setItem('last_btc_price', currentPrice.toString());
    }
  }, [currentPrice]);
  
  const fetchRealTimePrice = async () => {
    if (!selectedCoin || !seriesRef.current) {
      // If the series ref is null, try again after a delay
      setTimeout(fetchRealTimePrice, 5000);
      return;
    }
    
    try {
      // Try to get actual price from Coinbase
      const response = await axios.get(`https://api.coinbase.com/v2/prices/${selectedCoin}/spot`);
      if (response.data && response.data.data && response.data.data.amount) {
        const price = parseFloat(response.data.data.amount);
        setCurrentPrice(price);
        
        // Add new price point to chart - make sure series ref is still valid
        if (!seriesRef.current) {
          console.warn("Series reference lost during price update, skipping chart update");
          setTimeout(fetchRealTimePrice, 5000);
          return;
        }

        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        
        try {
        if (chartType === 'area') {
          (seriesRef.current as ISeriesApi<'Area'>).update({
            time: now as Time,
            value: price
          } as LineData);
        } else {
          // For candlestick, we would need OHLC data
          // In a real app, you would fetch candlestick data from an API
          // Here we'll simulate it based on the current price
          const previousPrice = currentPrice || price;
          const open = previousPrice;
          const close = price;
          const high = Math.max(open, close) * 1.001;
          const low = Math.min(open, close) * 0.999;
          
          (seriesRef.current as ISeriesApi<'Candlestick'>).update({
            time: now as Time,
            open,
            high,
            low,
            close
          } as LightweightCandlestickData);
          }
        } catch (error) {
          console.warn("Error updating chart series:", error);
          // The series may have been removed between the null check and the update
          // Don't rethrow, just try again later
        }
        
        // Start regular updates
        setTimeout(fetchRealTimePrice, 5000); // Update every 5 seconds
      }
    } catch (error) {
      console.error('Error fetching price from Coinbase:', error);
      // Retry after a delay
      setTimeout(fetchRealTimePrice, 10000);
    }
  };
  
  // Modify the placeTrade function to connect with the backend
  const placeTrade = async (direction: 'UP' | 'DOWN') => {
    // Validate amount
    if (amount < 70) {
      toast({
        title: "Invalid Amount",
        description: "Minimum trade amount is 70.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate balance
    if (amount > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds for this trade.",
        variant: "destructive"
      });
      return;
    }
    
    // Get the current price at the exact moment of the trade
    const entryPrice = currentPrice;

    // Show a more prominent confirmation alert with entry price details
    toast({
      title: `ENTRY PRICE: $${formatPrice(entryPrice)}`,
      description: `${direction} trade for $${amount} with duration ${formatTimeLeft(selectedTimeOption.value)}`,
      variant: "default",
    });
    
    try {
      console.log('Creating trade with entry price:', entryPrice);
      
      // Create trade in backend
      const tradeData = {
        symbol: selectedCoin.split('-')[0],
        direction, // Use UP/DOWN directly
        amount,
        expiry_seconds: selectedTimeOption.value,
        entry_price: entryPrice // Explicitly set entry price from client side
                                // This ensures the trading history will display
                                // the exact price seen by the user at trade execution time
      };
      
      // Try to create in backend
      let apiTrade;
      try {
        // Send the trade with entry price to the backend
        // The backend has been modified to respect this entry_price rather than fetching its own
        // This ensures consistency between the UI and stored trade data
        apiTrade = await binaryOptionsApi.createTrade(tradeData);
        console.log('Trade created successfully in backend:', apiTrade);
      } catch (error) {
        console.error("Error creating trade in backend:", error);
        // Continue with local trade anyway
      }
      
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = now + selectedTimeOption.value;
    
      // Create trade with explicit entry price
    const newTrade: Trade = {
        id: apiTrade?.id || `trade-${Date.now()}`,
      amount,
      direction,
        entryPrice: entryPrice, // Use saved entry price
      duration: selectedTimeOption.value,
      timeLeft: selectedTimeOption.value,
        status: 'active',
        entryTime: now,
        expiryTime: expiryTime
      };
      
      // Add visualization to chart - only if chart exists
      if (chartRef.current && seriesRef.current) {
        try {
          // Add marker for direction - arrow at entry point
          if (seriesRef.current.markers) {
            // Get existing markers
            const existingMarkers = seriesRef.current.markers() || [];
            
            // Create new marker
            const newMarker = {
              time: now as Time,
              position: direction === 'UP' ? 'belowBar' : 'aboveBar',
              color: direction === 'UP' ? '#22c55e' : '#ef4444',
              shape: direction === 'UP' ? 'arrowUp' : 'arrowDown',
              text: formatTimeLeft(selectedTimeOption.value), // Show MM:SS format for duration
              id: newTrade.id
            };
            
            // Add marker to existing markers
            seriesRef.current.setMarkers([...existingMarkers, newMarker]);
          }
        } catch (error) {
          console.error("Error adding trade markers:", error);
        }
      }
    
    // Deduct from balance
    setBalance(prev => prev - amount);
    
    // Add to active trades
    setActiveTrades(prev => [...prev, newTrade]);
    
    // Show success toast
    toast({
        title: "Trade Placed Successfully",
        description: `Entry Price: $${formatPrice(entryPrice)} | ${direction} trade | Duration: ${formatTimeLeft(selectedTimeOption.value)}`,
      });
    } catch (error) {
      console.error("Error placing trade:", error);
      toast({
        title: "Trade Failed",
        description: "Could not place trade. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Format duration in seconds to readable format
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };
  
  // Format time left in MM:SS format for countdowns
  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Format currency for prices
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Handle amount increment/decrement
  const incrementAmount = () => setAmount(prev => prev + 10);
  const decrementAmount = () => setAmount(prev => Math.max(70, prev - 10));
  
  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setAmount(Math.max(70, value));
    }
  };

  // Format price with appropriate decimal places
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    }
  };
  
  // Load trades from localStorage when component mounts
  useEffect(() => {
    const loadSavedTrades = () => {
      try {
        const savedTrades = loadTradesFromStorage();
        if (savedTrades.length > 0) {
          setTradeHistory(savedTrades);
        }
      } catch (error) {
        console.error('Error loading trades from storage:', error);
      }
    };
    
    loadSavedTrades();
  }, []);
  
  // Save trade history to localStorage whenever it changes
  useEffect(() => {
    if (tradeHistory.length > 0) {
      localStorage.setItem('trading_history', JSON.stringify(tradeHistory));
    }
  }, [tradeHistory]);
  
  // Fetch trades from backend when the History tab is shown
  useEffect(() => {
    if (showHistory) {
      const fetchTrades = async () => {
        try {
          // Check if auth token exists
          const token = localStorage.getItem('access_token');
          if (!token) {
            toast({
              title: "Authentication Required",
              description: "Please log in to view your trade history",
              variant: "destructive"
            });
            return;
          }
          
          const trades = await tradeHistoryApi.getAllTrades();
          setBackendTrades(trades);
        } catch (error) {
          console.error('Error fetching trades:', error);
          
          // Check if it's an authentication error
          if (error.response && error.response.status === 401) {
            toast({
              title: "Authentication Error",
              description: "Your session has expired. Please log in again.",
              variant: "destructive"
            });
            // Redirect to login page
            navigate('/login');
          } else {
            toast({
              title: "Error",
              description: "Could not load trade history. Please try again.",
              variant: "destructive"
            });
          }
        }
      };
      
      fetchTrades();
    }
  }, [showHistory, toast, navigate]);
  
  // Add a function to check for expired trades
  const checkExpiredTrades = async () => {
    try {
      // Check if auth token exists
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      // Call the backend endpoint to check and update expired trades
      // Don't use force=true parameter so trades only complete when they expire
      const response = await axios.get('/api/check-trades/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.updated_trades && response.data.updated_trades.length > 0) {
        console.log('Updated expired trades:', response.data.updated_trades);
        // Refresh trades data if we're in history mode
        if (showHistory) {
          const trades = await tradeHistoryApi.getAllTrades();
          setBackendTrades(trades);
        }
      }
    } catch (error) {
      console.error('Error checking expired trades:', error);
    }
  };
  
  // Add effect to periodically check for expired trades
  useEffect(() => {
    // Check for expired trades when component mounts or when in history mode
    checkExpiredTrades();
    
    // Set up interval to check for expired trades
    const interval = setInterval(() => {
      checkExpiredTrades();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [showHistory]); // Re-run when switching between history and trading view
  
  return (
    <div className="flex flex-col w-full h-full bg-black">
      {showHistory ? (
        <TradingHistory trades={backendTrades} />
      ) : (
        /* Main content with chart and trading panel */
        <div className="flex-1 flex h-full">
          {/* Chart area - make sure it takes full height */}
          <div className="flex-1 relative bg-black p-4 flex flex-col h-full">
            <div ref={chartContainerRef} className="flex-1 w-full h-full rounded-lg overflow-hidden border border-gray-800/40" />
            
            {/* Current price and chart type selection */}
            <div className="absolute bottom-6 left-6 flex items-center backdrop-blur-sm bg-[#1a1f2e]/80 p-3 rounded-lg shadow-lg border border-gray-700/30">
              <span className="mr-2 text-sm text-gray-300">Current Price:</span>
              <motion.span 
                className="text-cyan-400 text-lg font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={currentPrice}
              >
                ${formatPrice(currentPrice)}
              </motion.span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 text-xs text-gray-300 hover:text-white"
                onClick={() => {
                  // Copy the price to clipboard
                  navigator.clipboard.writeText(currentPrice.toString());
                  toast({
                    title: "Price Copied",
                    description: `Copied ${currentPrice} to clipboard. Use for processing trades.`,
                  });
                }}
              >
                Copy
              </Button>
            </div>
            
            <div className="absolute bottom-6 right-6 flex space-x-2 backdrop-blur-sm bg-[#1a1f2e]/80 p-1.5 rounded-lg shadow-lg border border-gray-700/30">
              <Button
                size="sm"
                variant={chartType === 'area' ? 'default' : 'outline'}
                onClick={() => setChartType('area')}
                className={chartType === 'area' ? 'bg-blue-600 border-0 hover:bg-blue-700' : 'border-gray-700 text-gray-400 hover:text-white'}
              >
                <LineIcon size={16} className="mr-1.5" />
                Area
              </Button>
              <Button
                size="sm"
                variant={chartType === 'candle' ? 'default' : 'outline'}
                onClick={() => setChartType('candle')}
                className={chartType === 'candle' ? 'bg-blue-600 border-0 hover:bg-blue-700' : 'border-gray-700 text-gray-400 hover:text-white'}
              >
                <CandlestickChartIcon size={16} className="mr-1.5" />
                Candle
              </Button>
            </div>
          </div>
          
          {/* Trading panel - right side */}
          <div className="w-96 bg-[#131b2e] border-l border-gray-800/80">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-white font-semibold">BTC/USD</span>
                  <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">+2.14%</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">${formatPrice(currentPrice)}</div>
                  <div className="text-xs text-gray-400">Last price</div>
                </div>
              </div>
              
              <div className="p-5 flex-1 overflow-auto">
              {/* Demo Balance */}
                <div className="mb-5 bg-[#1a1f2e] rounded-lg p-4 border border-gray-800/20">
                <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium">Demo Balance</span>
                    <span className="text-xl font-bold text-white">${balance.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Investment Amount */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2.5">
                  <span className="text-gray-300 font-medium">Investment Amount</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#1a1f2e] text-gray-400">Min: 70</span>
                </div>
                
                  <div className="relative bg-[#1a1f2e] rounded-lg overflow-hidden border border-gray-800/20">
                  <button 
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-gray-400 rounded-full hover:bg-[#242f42] transition-colors"
                    onClick={decrementAmount}
                    disabled={amount <= 70}
                  >
                    <MinusCircle size={18} />
                  </button>
                  
                  <input 
                    type="text" 
                    value={amount} 
                    onChange={handleAmountChange} 
                      className="w-full h-12 bg-transparent border-0 text-center text-white text-lg font-bold focus:outline-none focus:ring-0" 
                  />
                  
                  <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-gray-400 rounded-full hover:bg-[#242f42] transition-colors"
                    onClick={incrementAmount}
                    disabled={amount >= balance}
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
              </div>
              
                {/* Trade Duration */}
                <div className="mb-5">
                  <span className="text-gray-300 font-medium mb-2.5 block">Trade Duration</span>
                  
                  <div className="mb-3">
                    <div className="flex bg-[#1a1f2e] rounded-lg overflow-hidden">
                    <button
                        className={`flex-1 py-3 text-center font-medium text-sm ${
                          durationTab === 'timer' 
                            ? 'bg-blue-500 text-white' 
                            : 'text-gray-300 hover:bg-[#242f42]'
                        } transition-colors`}
                        onClick={() => setDurationTab('timer')}
                      >
                        Timer
                    </button>
                      <button
                        className={`flex-1 py-3 text-center font-medium text-sm ${
                          durationTab === 'clock' 
                            ? 'bg-blue-500 text-white' 
                            : 'text-gray-300 hover:bg-[#242f42]'
                        } transition-colors`}
                        onClick={() => setDurationTab('clock')}
                      >
                        Clock
                      </button>
                </div>
              </div>
              
                  {durationTab === 'timer' ? (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        className={`py-2.5 rounded-lg text-center text-sm ${
                          selectedTimeOption.value === 60 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-[#1a1f2e] text-white hover:bg-[#242f42]'
                        } transition-colors`}
                        onClick={() => setSelectedTimeOption(timeOptions[2])}
                      >
                        1 min
                      </button>
                      <button
                        className={`py-2.5 rounded-lg text-center text-sm ${
                          selectedTimeOption.value === 300 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-[#1a1f2e] text-white hover:bg-[#242f42]'
                        } transition-colors`}
                        onClick={() => setSelectedTimeOption(timeOptions[3])}
                      >
                        5 min
                      </button>
                      <button
                        className={`py-2.5 rounded-lg text-center text-sm ${
                          selectedTimeOption.value === 600 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-[#1a1f2e] text-white hover:bg-[#242f42]'
                        } transition-colors`}
                        onClick={() => setSelectedTimeOption(timeOptions[4])}
                      >
                        10 min
                      </button>
                      <button
                        className={`py-2.5 rounded-lg text-center text-sm ${
                          selectedTimeOption.value === 1800 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-[#1a1f2e] text-white hover:bg-[#242f42]'
                        } transition-colors`}
                        onClick={() => setSelectedTimeOption(timeOptions[5])}
                      >
                        30 min
                      </button>
                                </div>
                              ) : (
                    <div className="p-4 bg-[#1a1f2e] rounded-lg mb-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-3">
                        <div className="text-center text-xs text-gray-400 mb-1">Duration</div>
                        <div className="text-center text-white text-xl font-mono">
                          {Math.floor(selectedTimeOption.value / 3600).toString().padStart(2, '0')} h{' '}
                          {Math.floor((selectedTimeOption.value % 3600) / 60).toString().padStart(2, '0')} m
                                </div>
                            </div>
                      
                      <div className="flex justify-between">
                        <button 
                          className="w-12 h-12 rounded-lg bg-[#242f42] text-white flex items-center justify-center hover:bg-[#2a374d]"
                          onClick={() => {
                            const currentIndex = timeOptions.findIndex(opt => opt.value === selectedTimeOption.value);
                            if (currentIndex > 0) {
                              setSelectedTimeOption(timeOptions[currentIndex - 1]);
                            }
                          }}
                        >
                          <span className="text-xl">−</span>
                        </button>
                        
                        <button 
                          className="w-12 h-12 rounded-lg bg-[#242f42] text-white flex items-center justify-center hover:bg-[#2a374d]"
                          onClick={() => {
                            const currentIndex = timeOptions.findIndex(opt => opt.value === selectedTimeOption.value);
                            if (currentIndex < timeOptions.length - 1) {
                              setSelectedTimeOption(timeOptions[currentIndex + 1]);
                            }
                          }}
                        >
                          <span className="text-xl">+</span>
                        </button>
                            </div>
                          </div>
                  )}

                  <div className="bg-[#1a1f2e] rounded-lg flex justify-between items-center p-4">
                    <span className="text-white font-medium">Enable Orders</span>
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#242f42]">
                      <Clock size={16} className="text-gray-300" />
                          </div>
                    </div>
                </div>
                
                {/* Buy/Sell buttons */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <button 
                    className="bg-green-500 hover:bg-green-600 h-12 rounded-lg text-base font-medium flex items-center justify-center transition-colors"
                    onClick={() => placeTrade('UP')}
                    disabled={amount > balance}
                  >
                    <ArrowUp size={18} className="mr-2" />
                    <span>Up</span>
                  </button>
                  <button 
                    className="bg-red-500 hover:bg-red-600 h-12 rounded-lg text-base font-medium flex items-center justify-center transition-colors"
                    onClick={() => placeTrade('DOWN')}
                    disabled={amount > balance}
                  >
                    <ArrowDown size={18} className="mr-2" />
                    <span>Down</span>
                  </button>
              </div>
                
                {/* Bottom spacer to replace the recent trades section */}
                <div className="h-5"></div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default CryptoTradingView; 