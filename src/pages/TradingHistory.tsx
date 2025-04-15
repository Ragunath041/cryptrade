import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Download, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Trade interface aligned with the Django BinaryOptionTrade model
interface Trade {
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

interface TradingHistoryProps {
  trades?: Trade[];
}

const TradingHistory: React.FC<TradingHistoryProps> = ({ trades: propTrades }) => {
  const [trades, setTrades] = useState<Trade[]>(propTrades || []);
  const [loading, setLoading] = useState(!propTrades);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  // Add state for tracking remaining time for active trades
  const [remainingTimes, setRemainingTimes] = useState<{[key: string]: number}>({});
  // Add state for tracking current price status for active trades
  const [priceStatuses, setPriceStatuses] = useState<{[key: string]: { currentPrice: number, status: string }}>({});
  // Add a state to track trades that are being processed (timer reached zero but status not updated yet)
  const [processingTrades, setProcessingTrades] = useState<string[]>([]);
  // Add a state to track polling attempts for processing trades
  const [pollingAttempts, setPollingAttempts] = useState<{[key: string]: number}>({});
  
  // Function to format duration in seconds to readable format
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

  // Add a new function to format time left in MM:SS format for trading durations
  const formatTimeLeft = (seconds: number): string => {
    // For trading durations, we want to display time in MM:SS format
    // even for durations longer than an hour, we'll just convert to total minutes
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    // Format as MM:SS
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Update trades when propTrades changes
  useEffect(() => {
    if (propTrades) {
      setTrades(propTrades);
      setLoading(false);
    }
  }, [propTrades]);

  // Add a function to check for expired trades
  const checkExpiredTrades = async () => {
    try {
      // Check if auth token exists
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      // Call the new backend endpoint to check and update expired trades
      // Don't use force=true parameter so trades only complete when they expire
      const response = await axios.get('/api/check-trades/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.updated_trades && response.data.updated_trades.length > 0) {
        console.log('Updated expired trades:', response.data.updated_trades);
        // Refresh trades data after updating
        fetchTrades();
      }
    } catch (error) {
      console.error('Error checking expired trades:', error);
    }
  };

  // Modified fetchTrades function that can be called from other places
  const fetchTrades = async () => {
    setLoading(true);
    try {
      // Check if auth token exists
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your trade history",
          variant: "destructive"
        });
        setTrades([]);
        setLoading(false);
        return;
      }

      // Use axios with the global configuration
      const response = await axios.get('/api/binary-options/');
      
      if (Array.isArray(response.data)) {
        console.log('Received trades from backend:', response.data);
        setTrades(response.data);
      } else {
        console.error("Invalid data format received:", response.data);
        setTrades([]);
      }
    } catch (error) {
      console.error("Error loading trade history:", error);
      
      // Check if it's an authentication error
      if (error.response && error.response.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error loading trades",
          description: "Could not load your trade history. Please try again later.",
          variant: "destructive"
        });
      }
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  // Load trades directly from the Django backend only if trades prop is not provided
  useEffect(() => {
    // Skip fetching if trades were provided via props
    if (propTrades) {
      return;
    }

    // First fetch trades, then check for any expired trades that need updating
    fetchTrades().then(() => {
      // After fetching trades, immediately update price statuses
      updatePriceStatuses();
      // Then check for expired trades
      checkExpiredTrades();
    });
    
    // Set up periodic refreshing of trade data and expired trade checks
    const refreshInterval = setInterval(() => {
      fetchTrades();
      updatePriceStatuses();
      checkExpiredTrades();
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [toast, propTrades]);

  // Add effect to update countdown timers
  useEffect(() => {
    console.log('Initializing remaining times for trades:', trades);
    
    // Initialize remaining times for active trades
    const initRemainingTimes: {[key: string]: number} = {};
    
    trades.forEach(trade => {
      if (trade.status === 'ACTIVE') {
        console.log('Active trade found:', trade);
        
        // Use the expiry_seconds directly as the base duration (e.g., 60 for 1 minute)
        const tradeDuration = trade.expiry_seconds;
        
        // Calculate how much time has passed since the trade was created
        const createdTime = new Date(trade.created_at).getTime();
        const currentTime = new Date().getTime();
        const elapsedSeconds = Math.floor((currentTime - createdTime) / 1000);
        
        // Calculate remaining seconds by subtracting elapsed time from the full duration
        let secondsLeft = Math.max(0, tradeDuration - elapsedSeconds);
        
        // Log the calculation details
        console.log(`Trade ${trade.id} details:`, {
          created: new Date(trade.created_at).toISOString(),
          now: new Date().toISOString(),
          duration: tradeDuration,
          elapsed: elapsedSeconds,
          remaining: secondsLeft
        });
        
        // For safety, ensure the remaining time doesn't exceed the original duration
        if (secondsLeft > tradeDuration) {
          secondsLeft = tradeDuration;
        }
        
        initRemainingTimes[trade.id] = secondsLeft;
      }
    });
    
    console.log('Initial remaining times:', initRemainingTimes);
    setRemainingTimes(initRemainingTimes);

    // Update the timer function to handle processing state
    const timer = setInterval(() => {
      setRemainingTimes(prev => {
        const updated = {...prev};
        let hasActiveTimers = false;
        const newProcessingTrades: string[] = [...processingTrades];
        let shouldRefreshTrades = false;
        
        Object.keys(updated).forEach(id => {
          if (updated[id] > 0) {
            updated[id] -= 1;
            hasActiveTimers = true;
            
            // Check if timer just reached zero - if so, mark as processing and refresh data
            if (updated[id] === 0) {
              console.log(`Timer reached zero for trade ${id}, marking as processing...`);
              if (!newProcessingTrades.includes(id)) {
                newProcessingTrades.push(id);
              }
              shouldRefreshTrades = true;
            }
          }
        });
        
        // Update processing trades list
        if (newProcessingTrades.length !== processingTrades.length) {
          setProcessingTrades(newProcessingTrades);
        }
        
        // If any timer reached zero, refresh trades data to get updated statuses
        if (shouldRefreshTrades) {
          // Add a small delay to allow backend to process
          setTimeout(() => {
            checkExpiredTrades().then(() => {
              fetchTrades();
            });
          }, 2000);
        }
        
        // If no active timers left, clear the interval
        if (!hasActiveTimers) {
          clearInterval(timer);
        }
        
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [trades, processingTrades]);

  // Add a function to force update all trades
  const forceUpdateTrades = async (manualPrice?: number) => {
    try {
      // Show a loading toast
      toast({
        title: "Updating trades",
        description: "Forcing update of all active trades...",
      });
      
      if (manualPrice && processingTrades.length > 0) {
        // If we have a manual price and processing trades, use the API with custom price parameter
        // and ignore_expiry parameter to force process even if time isn't up
        const token = localStorage.getItem('access_token');
        if (!token) {
          toast({
            title: "Authentication Required",
            description: "Please log in to update trades",
            variant: "destructive"
          });
          return;
        }
        
        // Make a special API call including the manual price and ignore_expiry
        try {
          const response = await axios.get(`/api/check-trades/?force=true&ignore_expiry=true&manual_price=${manualPrice}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Manual price update response:', response.data);
        } catch (error) {
          console.error('Error with manual price update:', error);
        }
      } else {
        // For regular manual updates, we'll check only expired trades
        await checkExpiredTrades();
      }
      
      // Refresh the trades list
      await fetchTrades();
      
      // Show success toast
      toast({
        title: "Trades updated",
        description: "All trades have been updated.",
      });
    } catch (error) {
      console.error('Error forcing trade updates:', error);
      toast({
        title: "Update failed",
        description: "Could not update trades. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to force complete all active trades
  const forceCompleteAllTrades = async () => {
    try {
      // Show a loading toast
      toast({
        title: "Force Processing Trades",
        description: "Completing all active trades with current prices...",
      });
      
      // Get current price from trading page or API
      const price = await fetchCurrentBTCPrice();
      
      if (!price) {
        toast({
          title: "Error",
          description: "Could not get current price. Please enter a price manually.",
          variant: "destructive"
        });
        return;
      }
      
      // Force process all trades with the current price
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to update trades",
          variant: "destructive"
        });
        return;
      }
      
      // Make API call with stronger force parameters
      try {
        const response = await axios.get(`/api/check-trades/?force=true&ignore_expiry=true&manual_price=${price}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Force complete response:', response.data);
        
        // Refresh trades after forcing completion
        await fetchTrades();
        
        toast({
          title: "Trades Completed",
          description: `All trades processed with price: ${formatCurrency(price)}`,
        });
      } catch (error) {
        console.error('Error with force complete:', error);
        toast({
          title: "Processing Failed",
          description: "Could not process trades. Try again or contact support.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in force complete:', error);
      toast({
        title: "Processing Failed",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  // Update the filteredTrades to filter by UP/DOWN
  const filteredTrades = Array.isArray(trades) ? trades.filter(trade => {
    // Apply filter
    if (filter !== 'all') {
      if (filter === 'buy' && trade.direction !== 'UP') return false;
      if (filter === 'sell' && trade.direction !== 'DOWN') return false;
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        trade.symbol.toLowerCase().includes(query) ||
        trade.direction.toLowerCase().includes(query) ||
        trade.amount.toString().includes(query) ||
        trade.entry_price.toString().includes(query)
      );
    }
    
    return true;
  }).sort((a, b) => {
    // Apply sorting
    return sortDirection === 'desc' 
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() 
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }) : [];

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status: Trade['status']) => {
    switch (status) {
      case 'WON':
        return 'text-green-500';
      case 'ACTIVE':
        return 'text-yellow-500';
      case 'LOST':
      case 'EXPIRED':
        return 'text-red-500';
      default:
        return '';
    }
  };
  
  // Helper function to determine trade outcome with clear explanation
  const getTradeOutcome = (trade: Trade) => {
    if (trade.status === 'ACTIVE') {
      return { 
        result: 'Pending',
        explanation: 'Trade is still active'
      };
    }
    
    // If we have exit price, determine outcome based on price comparison
    if (trade.exit_price !== null) {
      const entryPrice = trade.entry_price;
      const exitPrice = trade.exit_price;
      
      if (trade.direction === 'UP') {
        if (exitPrice > entryPrice) {
          return {
            result: 'WON',
            explanation: `Price increased from ${formatCurrency(entryPrice)} to ${formatCurrency(exitPrice)}`
          };
        } else if (exitPrice < entryPrice) {
          return {
            result: 'LOST',
            explanation: `Price decreased from ${formatCurrency(entryPrice)} to ${formatCurrency(exitPrice)}`
          };
        } else {
          return {
            result: 'DRAW',
            explanation: `Price unchanged at ${formatCurrency(entryPrice)}`
          };
        }
      } else { // DOWN trade
        if (exitPrice < entryPrice) {
          return {
            result: 'WON',
            explanation: `Price decreased from ${formatCurrency(entryPrice)} to ${formatCurrency(exitPrice)}`
          };
        } else if (exitPrice > entryPrice) {
          return {
            result: 'LOST',
            explanation: `Price increased from ${formatCurrency(entryPrice)} to ${formatCurrency(exitPrice)}`
          };
        } else {
          return {
            result: 'DRAW',
            explanation: `Price unchanged at ${formatCurrency(entryPrice)}`
          };
        }
      }
    }
    
    // If no exit price but status is not active, return the status
    return { 
      result: trade.status,
      explanation: 'No exit price available'
    };
  };

  // Function to export trades as CSV
  const exportTradesAsCSV = () => {
    if (trades.length === 0) {
      return;
    }

    // Create CSV headers
    const headers = ['Date', 'Crypto', 'Type', 'Amount', 'Entry Price', 'Duration', 'Status', 'Profit/Loss'];
    
    // Create CSV rows from filtered trades
    const csvRows = [
      headers.join(','),
      ...filteredTrades.map(trade => [
        new Date(trade.created_at).toISOString(),
        trade.symbol,
        trade.direction,
        trade.amount,
        trade.entry_price,
        formatDuration(trade.expiry_seconds),
        trade.status,
        trade.payout_amount ? 
          (trade.status === 'WON' ? '+' : '-') + Math.abs(trade.payout_amount) : 
          (trade.status === 'ACTIVE' ? 'Pending' : '-' + trade.amount)
      ].join(','))
    ];

    // Combine into a single CSV string
    const csvString = csvRows.join('\n');
    
    // Create a Blob with the CSV data
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link and trigger the download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trading-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to update the current price statuses
  const updatePriceStatuses = async () => {
    const activeTradeIds = trades
      .filter(trade => trade.status === 'ACTIVE')
      .map(trade => trade.id);
      
    if (activeTradeIds.length === 0) return;
    
    try {
      // Get the current price from Binance
      const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const currentPrice = parseFloat(response.data.price);
      
      // Create a new statuses object
      const newStatuses = { ...priceStatuses };
      
      // Update each active trade with the current price
      for (const trade of trades.filter(t => t.status === 'ACTIVE')) {
        let status = '';
        
        // Determine if the trade is winning or losing
        if (trade.direction === 'UP') {
          status = currentPrice > trade.entry_price ? 'winning' : 
                  currentPrice < trade.entry_price ? 'losing' : 'draw';
        } else { // DOWN
          status = currentPrice < trade.entry_price ? 'winning' : 
                  currentPrice > trade.entry_price ? 'losing' : 'draw';
        }
        
        // Update the status for this trade
        newStatuses[trade.id] = {
          currentPrice,
          status
        };
      }
      
      // Update the state with the new price statuses
      setPriceStatuses(newStatuses);
    } catch (error) {
      console.error('Error fetching current price:', error);
      
      // Use a fallback mock price just for display purposes
      const fallbackPrice = 85000;
      
      const newStatuses = { ...priceStatuses };
      
      // Update each active trade with the fallback price
      for (const trade of trades.filter(t => t.status === 'ACTIVE')) {
        if (!newStatuses[trade.id]) {
          let status = '';
          
          // Determine if the trade is winning or losing
          if (trade.direction === 'UP') {
            status = fallbackPrice > trade.entry_price ? 'winning' : 
                    fallbackPrice < trade.entry_price ? 'losing' : 'draw';
          } else { // DOWN
            status = fallbackPrice < trade.entry_price ? 'winning' : 
                    fallbackPrice > trade.entry_price ? 'losing' : 'draw';
          }
          
          // Update the status for this trade
          newStatuses[trade.id] = {
            currentPrice: fallbackPrice,
            status
          };
        }
      }
      
      // Update the state with the fallback prices if we don't already have prices
      if (Object.keys(newStatuses).length > Object.keys(priceStatuses).length) {
        setPriceStatuses(newStatuses);
      }
    }
  };
  
  // Effect to periodically update price statuses
  useEffect(() => {
    // Only run if we have active trades
    const hasActiveTrades = trades.some(trade => trade.status === 'ACTIVE');
    if (!hasActiveTrades) return;
    
    // Immediately update price statuses when component mounts or trades change
    updatePriceStatuses();
    
    // Set up interval for regular price updates
    const interval = setInterval(updatePriceStatuses, 3000); // Update every 3 seconds
    
    return () => clearInterval(interval);
  }, [trades]);

  // Effect to handle polling for processing trades
  useEffect(() => {
    if (processingTrades.length === 0) return;
    
    console.log("Currently processing trades:", processingTrades);
    
    // Set up polling to check status more frequently
    const pollingInterval = setInterval(() => {
      // Update polling attempts counter
      const updatedAttempts = {...pollingAttempts};
      let shouldContinuePolling = false;
      
      processingTrades.forEach(id => {
        if (!updatedAttempts[id]) updatedAttempts[id] = 0;
        
        // Increment attempt counter
        updatedAttempts[id]++;
        
        // If we've tried less than 20 times, keep polling (increased from 10)
        if (updatedAttempts[id] < 20) {
          shouldContinuePolling = true;
        } else {
          console.log(`Reached maximum polling attempts (20) for trade ${id}`);
        }
      });
      
      setPollingAttempts(updatedAttempts);
      
      // Try a stronger forcing approach after 5 attempts
      const shouldForceCompletion = processingTrades.some(id => 
        updatedAttempts[id] && updatedAttempts[id] >= 5);
      
      // Check expired trades with more force as attempts increase
      const checkTradesWithForce = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        try {
          // If we've tried 5+ times, use stronger force parameters
          if (shouldForceCompletion) {
            console.log("Using stronger force parameters for stuck trades");
            const price = await fetchCurrentBTCPrice();
            if (price) {
              const response = await axios.get(`/api/check-trades/?force=true&ignore_expiry=true&manual_price=${price}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              console.log('Force response:', response.data);
            } else {
              console.log("Could not get current price for forcing");
            }
          } else {
            // Regular expired trade check
            await checkExpiredTrades();
          }
          
          // Refresh trade data
          await fetchTrades();
          
          // Check if any processing trades are now complete
          const stillProcessing = processingTrades.filter(id => {
            const trade = trades.find(t => t.id === id);
            return trade && trade.status === 'ACTIVE';
          });
          
          // Update processing trades list
          if (stillProcessing.length !== processingTrades.length) {
            setProcessingTrades(stillProcessing);
          }
          
          // If no more trades are processing or we've reached max attempts, stop polling
          if (stillProcessing.length === 0 || !shouldContinuePolling) {
            clearInterval(pollingInterval);
            setPollingAttempts({});
          }
        } catch (error) {
          console.error("Error during forced trade check:", error);
        }
      };
      
      checkTradesWithForce();
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(pollingInterval);
  }, [processingTrades, trades, pollingAttempts]);

  // Add a dedicated function to fetch prices from Binance (no mock data)
  const fetchCurrentBTCPrice = async (): Promise<number | null> => {
    try {
      // First try to use price from localStorage (set by trading page)
      const savedPrice = localStorage.getItem('last_btc_price');
      if (savedPrice) {
        const price = parseFloat(savedPrice);
        if (!isNaN(price) && price > 0) {
          console.log('Using price from trading page:', price);
          return price;
        }
      }
      
      // If no saved price, fetch from Binance
      const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const currentPrice = parseFloat(response.data.price);
      return currentPrice;
    } catch (error) {
      console.error('Error fetching Binance price:', error);
      return null;
    }
  };

  // Function to directly update Last Price column without mock data
  const manuallyRefreshPrices = async () => {
    toast({
      title: "Refreshing prices",
      description: "Fetching latest price data...",
    });
    
    const price = await fetchCurrentBTCPrice();
    
    if (price) {
      const newStatuses = { ...priceStatuses };
      
      // Update all active trades with the current price
      for (const trade of trades.filter(t => t.status === 'ACTIVE')) {
        let status = '';
        
        // Determine if the trade is winning or losing
        if (trade.direction === 'UP') {
          status = price > trade.entry_price ? 'winning' : 
                  price < trade.entry_price ? 'losing' : 'draw';
        } else { // DOWN
          status = price < trade.entry_price ? 'winning' : 
                  price > trade.entry_price ? 'losing' : 'draw';
        }
        
        // Update the status for this trade
        newStatuses[trade.id] = {
          currentPrice: price,
          status
        };
      }
      
      // Update the state with the new price statuses
      setPriceStatuses(newStatuses);
      
      toast({
        title: "Prices updated",
        description: `Current BTC price: ${formatCurrency(price)}`,
      });
    } else {
      toast({
        title: "Price update failed",
        description: "Could not fetch latest price data",
        variant: "destructive"
      });
    }
  };

  // Initial load effect - This runs when the component first mounts
  useEffect(() => {
    // Initialize prices when component mounts
    const initializePrices = async () => {
      const price = await fetchCurrentBTCPrice();
      if (price && trades.some(t => t.status === 'ACTIVE')) {
        const initialStatuses: {[key: string]: { currentPrice: number, status: string }} = {};
        
        for (const trade of trades.filter(t => t.status === 'ACTIVE')) {
          let status = '';
          
          // Determine if the trade is winning or losing
          if (trade.direction === 'UP') {
            status = price > trade.entry_price ? 'winning' : 
                    price < trade.entry_price ? 'losing' : 'draw';
          } else { // DOWN
            status = price < trade.entry_price ? 'winning' : 
                    price > trade.entry_price ? 'losing' : 'draw';
          }
          
          // Set the initial status for this trade
          initialStatuses[trade.id] = {
            currentPrice: price,
            status
          };
        }
        
        // Initialize price statuses
        setPriceStatuses(initialStatuses);
      }
    };
    
    // Run initialization
    initializePrices();
  }, []);

  // Function to manually set the current price for all active trades
  const setFixedPrice = (price: number) => {
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid BTC price",
        variant: "destructive"
      });
      return;
    }
    
    const newStatuses = { ...priceStatuses };
    
    // Update all active trades with the fixed price
    for (const trade of trades.filter(t => t.status === 'ACTIVE')) {
      let status = '';
      
      // Determine if the trade is winning or losing
      if (trade.direction === 'UP') {
        status = price > trade.entry_price ? 'winning' : 
                price < trade.entry_price ? 'losing' : 'draw';
      } else { // DOWN
        status = price < trade.entry_price ? 'winning' : 
                price > trade.entry_price ? 'losing' : 'draw';
      }
      
      // Update the status for this trade
      newStatuses[trade.id] = {
        currentPrice: price,
        status
      };
    }
    
    // Update the state with the new price statuses
    setPriceStatuses(newStatuses);
    
    toast({
      title: "Last Price Updated",
      description: `All trades now show Last Price: ${formatCurrency(price)}`,
    });
  };

  // Add an effect to check for localStorage price updates from trading page
  useEffect(() => {
    // Only run if we have active trades
    const hasActiveTrades = trades.some(trade => trade.status === 'ACTIVE');
    if (!hasActiveTrades) return;

    // Function to update prices from localStorage
    const updateFromLocalStorage = () => {
      const savedPrice = localStorage.getItem('last_btc_price');
      if (savedPrice) {
        const price = parseFloat(savedPrice);
        if (!isNaN(price) && price > 0) {
          // Only update if price is different
          const firstActiveTradeId = trades.find(t => t.status === 'ACTIVE')?.id;
          if (firstActiveTradeId && 
              (!priceStatuses[firstActiveTradeId] || 
               priceStatuses[firstActiveTradeId].currentPrice !== price)) {
            
            console.log('Updating prices from localStorage value:', price);
            
            const newStatuses = { ...priceStatuses };
            
            // Update all active trades with the current price
            for (const trade of trades.filter(t => t.status === 'ACTIVE')) {
              let status = '';
              
              // Determine if the trade is winning or losing
              if (trade.direction === 'UP') {
                status = price > trade.entry_price ? 'winning' : 
                        price < trade.entry_price ? 'losing' : 'draw';
              } else { // DOWN
                status = price < trade.entry_price ? 'winning' : 
                        price > trade.entry_price ? 'losing' : 'draw';
              }
              
              // Update the status for this trade
              newStatuses[trade.id] = {
                currentPrice: price,
                status
              };
            }
            
            // Update the state with the new price statuses
            setPriceStatuses(newStatuses);
          }
        }
      }
    };

    // Check immediately
    updateFromLocalStorage();
    
    // Then set up interval to check frequently
    const interval = setInterval(updateFromLocalStorage, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [trades, priceStatuses]);

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Trading History</h1>
        
        {/* Add a special banner when trades are stuck in processing */}
        {processingTrades.length > 0 && (
          <div className="mb-6 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg">
            <h2 className="text-lg font-semibold text-orange-400 mb-2">
              {processingTrades.length} trade(s) stuck in processing
            </h2>
            <p className="text-gray-300 mb-3">
              These trades are waiting for price data from the exchange.
              {fetchCurrentBTCPrice ? ` Current BTC price: ${formatCurrency(priceStatuses[processingTrades[0]]?.currentPrice || 0)}` : ''}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={forceCompleteAllTrades}
              >
                Force Complete All Trades
              </Button>
              
              <div className="flex gap-2">
                <div className="relative bg-gray-800 rounded-lg overflow-hidden w-48">
                  <input 
                    type="number" 
                    placeholder="Enter exact BTC price"
                    className="w-full h-10 bg-transparent border-0 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    id="manualPriceInput"
                  />
                </div>
                <Button 
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => {
                    const input = document.getElementById('manualPriceInput') as HTMLInputElement;
                    const price = parseFloat(input.value);
                    if (!isNaN(price) && price > 0) {
                      forceUpdateTrades(price);
                    } else {
                      toast({
                        title: "Invalid price",
                        description: "Please enter a valid BTC price",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  Process with this Price
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Filters and search */}
        <div className="flex flex-col md:flex-row justify-between mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4 md:mb-0">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="buy">UP Only</SelectItem>
                <SelectItem value="sell">DOWN Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline"
              className="flex gap-2 items-center bg-gray-900 border-gray-700"
              onClick={toggleSortDirection}
            >
              <ArrowDownUp size={16} />
              Sort by Date ({sortDirection === 'desc' ? 'Newest First' : 'Oldest First'})
            </Button>
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search transactions..."
                className="pl-10 bg-gray-900 border-gray-700"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button 
              variant="outline" 
              className="bg-gray-900 border-gray-700"
              onClick={() => forceUpdateTrades()}
            >
              Update Trades
            </Button>
            
            <div className="flex items-center gap-2">
              <Input 
                type="number"
                placeholder="Set Last Price"
                className="w-32 bg-gray-900 border-gray-700"
                id="fixedPriceInput"
              />
              <Button 
                variant="outline" 
                className="bg-gray-900 border-gray-700"
                onClick={() => {
                  const input = document.getElementById('fixedPriceInput') as HTMLInputElement;
                  const price = parseFloat(input.value);
                  setFixedPrice(price);
                }}
              >
                Set Price
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              className="bg-gray-900 border-gray-700"
              onClick={() => manuallyRefreshPrices()}
              title="Gets the latest price from the trading page"
            >
              Use Trading Page Price
            </Button>
            
            <Button 
              variant="outline" 
              className="bg-gray-900 border-gray-700"
              onClick={exportTradesAsCSV}
              disabled={filteredTrades.length === 0}
            >
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Transactions table */}
        <div className="rounded-md border border-gray-800 bg-gray-950">
          <Table>
            <TableCaption>{loading ? 'Loading transaction history...' : 'Your trading transaction history'}</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-gray-900 border-gray-800">
                <TableHead className="text-gray-400">Date & Time</TableHead>
                <TableHead className="text-gray-400">Crypto</TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead className="text-gray-400 text-right">Amount</TableHead>
                <TableHead className="text-gray-400 text-right">Entry Price</TableHead>
                <TableHead className="text-gray-400 text-right">Last Price</TableHead>
                <TableHead className="text-gray-400 text-right">Duration</TableHead>
                <TableHead className="text-gray-400 text-right">Time Left (MM:SS)</TableHead>
                <TableHead className="text-gray-400 text-right">Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Loading your transaction history...</p>
                  </TableCell>
                </TableRow>
              ) : filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <p className="text-gray-500">No trades yet. Place a trade to see your history here.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id} className="hover:bg-gray-900 border-gray-800">
                    <TableCell className="font-medium">{formatDate(trade.created_at)}</TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <span className={trade.direction === 'UP' ? 'text-green-500' : 'text-red-500'}>
                        {trade.direction}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(trade.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(trade.entry_price || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.status === 'ACTIVE' ? (
                        <>
                          {priceStatuses[trade.id] ? (
                            <div className={`flex items-center justify-end ${
                              priceStatuses[trade.id]?.status === 'winning' ? 'text-green-500 font-bold' : 
                              priceStatuses[trade.id]?.status === 'losing' ? 'text-red-500 font-bold' : 
                              'text-cyan-400'
                            }`}>
                              {formatCurrency(priceStatuses[trade.id].currentPrice)}
                              <span className="ml-1 text-lg">
                                {priceStatuses[trade.id].status === 'winning' ? '↑' : 
                                 priceStatuses[trade.id].status === 'losing' ? '↓' : 
                                 '–'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 animate-pulse">
                              Loading...
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">
                          {trade.exit_price ? formatCurrency(trade.exit_price) : '---'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(trade.expiry_seconds)}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.status === 'ACTIVE' ? (
                        <div className="flex flex-col items-end">
                          {remainingTimes[trade.id] === 0 || processingTrades.includes(trade.id) ? (
                            <div className="flex flex-col items-end">
                              <span className="text-orange-500 font-mono text-lg animate-pulse">
                                Processing...
                              </span>
                              <Button
                                size="sm" 
                                variant="outline"
                                className="mt-1 py-0 h-6 text-xs bg-orange-950/80 border-orange-700/50 hover:bg-orange-900"
                                onClick={async () => {
                                  // Get current price
                                  const price = await fetchCurrentBTCPrice();
                                  
                                  if (!price) {
                                    toast({
                                      title: "Error",
                                      description: "Could not get current price",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  
                                  // Force complete this specific trade
                                  const token = localStorage.getItem('access_token');
                                  if (!token) return;
                                  
                                  try {
                                    const response = await axios.get(`/api/check-trades/?force=true&ignore_expiry=true&manual_price=${price}&trade_id=${trade.id}`, {
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    console.log(`Fixed trade ${trade.id}:`, response.data);
                                    fetchTrades();
                                    
                                    toast({
                                      title: "Trade Fixed",
                                      description: `Processed with price: ${formatCurrency(price)}`,
                                    });
                                  } catch (error) {
                                    console.error("Error fixing trade:", error);
                                    toast({
                                      title: "Fix Failed",
                                      description: "Could not process trade",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                Fix
                              </Button>
                            </div>
                          ) : (
                            <span className="text-yellow-500 font-mono text-lg">
                              {remainingTimes[trade.id] !== undefined 
                                ? formatTimeLeft(remainingTimes[trade.id]) 
                                : '00:00'}
                            </span>
                          )}
                          {priceStatuses[trade.id] && remainingTimes[trade.id] > 0 && (
                            <span className={
                              priceStatuses[trade.id].status === 'winning' ? 'text-green-500 text-xs font-semibold' : 
                              priceStatuses[trade.id].status === 'losing' ? 'text-red-500 text-xs font-semibold' : 
                              'text-gray-400 text-xs'
                            }>
                              {priceStatuses[trade.id].status === 'winning' ? '(winning)' : 
                               priceStatuses[trade.id].status === 'losing' ? '(losing)' : 
                               '(even)'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={getStatusColor(trade.status)}>
                          {trade.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.status === 'ACTIVE' ? (
                        <span className="text-yellow-500">Pending</span>
                      ) : (
                        <div className="relative group">
                          {trade.payout_amount ? (
                            <span className={trade.status === 'WON' ? 'text-green-500' : 'text-red-500'}>
                              {trade.status === 'WON' ? '+' : '-'}
                              {formatCurrency(Math.abs(trade.payout_amount))}
                            </span>
                          ) : (
                            <span className="text-red-500">-{formatCurrency(trade.amount)}</span>
                          )}
                          
                          {/* Tooltip showing price comparison */}
                          {(trade.status === 'WON' || trade.status === 'LOST' || trade.status === 'EXPIRED') && trade.exit_price && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-48 z-10">
                              {getTradeOutcome(trade).explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default TradingHistory; 