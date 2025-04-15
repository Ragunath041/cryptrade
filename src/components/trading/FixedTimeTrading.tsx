import React, { useState, useEffect, useRef } from 'react';
import { createChart, IChartApi, UTCTimestamp, ColorType } from 'lightweight-charts';
import { ArrowUp, ArrowDown, AlertCircle, Timer, TrendingUp } from 'lucide-react';
import { API } from '@/lib/api';
import { Coin } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';

interface FixedTimeTradingProps {
  coin: Coin;
}

interface Trade {
  id: string;
  direction: 'up' | 'down';
  amount: number;
  timeFrame: number; // in seconds
  entryPrice: number;
  targetPrice?: number;
  startTime: number;
  endTime: number;
  status: 'active' | 'won' | 'lost';
  payout: number;
}

const TIME_FRAMES = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 }
];

const PAYOUT_PERCENTAGE = 85; // 85% payout

const FixedTimeTrading: React.FC<FixedTimeTradingProps> = ({ coin }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(TIME_FRAMES[1]); // Default to 1m
  const [amount, setAmount] = useState<string>('');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [demoBalance, setDemoBalance] = useState(50000); // ₹50,000 initial balance
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch real-time price data
  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        const data = await API.getIntradayData(coin.id, '1m');
        if (data && data.length > 0) {
          setChartData(data);
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
      }
    };

    fetchPriceData();
    const interval = setInterval(fetchPriceData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [coin.id]);

  // Initialize chart
  useEffect(() => {
    if (chartContainerRef.current && chartData.length > 0 && !chart) {
      const chartOptions = {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        crosshair: {
          mode: 1,
          vertLine: {
            width: 1,
            color: 'rgba(255, 255, 255, 0.3)',
            style: 3,
          },
          horzLine: {
            width: 1,
            color: 'rgba(255, 255, 255, 0.3)',
            style: 3,
          },
        },
      };

      const newChart = createChart(chartContainerRef.current, chartOptions);
      const candlestickSeries = newChart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      // Add volume series
      const volumeSeries = newChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      // Set the data
      candlestickSeries.setData(chartData);
      
      // Create volume data
      const volumeData = chartData.map(item => ({
        time: item.time,
        value: item.volume || Math.random() * 1000,
        color: item.close >= item.open ? '#22c55e' : '#ef4444',
      }));
      volumeSeries.setData(volumeData);

      newChart.timeScale().fitContent();
      setChart(newChart);

      const handleResize = () => {
        if (chartContainerRef.current) {
          newChart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        newChart.remove();
      };
    }
  }, [chartData, chart]);

  // Update chart when data changes
  useEffect(() => {
    if (chart && chartData.length > 0) {
      const candlestickSeries = chart.series()[0];
      const volumeSeries = chart.series()[1];

      candlestickSeries.setData(chartData);
      
      // Update volume data
      const volumeData = chartData.map(item => ({
        time: item.time,
        value: item.volume || Math.random() * 1000,
        color: item.close >= item.open ? '#22c55e' : '#ef4444',
      }));
      volumeSeries.setData(volumeData);

      chart.timeScale().fitContent();
    }
  }, [chartData, chart]);

  // Check active trades
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const currentPrice = coin.price;

      setActiveTrades(prevTrades => {
        const updatedTrades = prevTrades.map(trade => {
          if (trade.status === 'active' && currentTime >= trade.endTime) {
            const won = (trade.direction === 'up' && currentPrice > trade.entryPrice) ||
                       (trade.direction === 'down' && currentPrice < trade.entryPrice);
            
            // Update balance
            setDemoBalance(prevBalance => {
              if (won) {
                return prevBalance + (trade.amount * (1 + PAYOUT_PERCENTAGE / 100));
              }
              return prevBalance;
            });

            return { ...trade, status: won ? 'won' : 'lost' };
          }
          return trade;
        });

        return updatedTrades.filter(trade => 
          trade.status === 'active' || 
          (trade.status !== 'active' && currentTime - trade.endTime < 10000) // Show completed trades for 10 seconds
        );
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [coin.price]);

  const placeTrade = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }

    const tradeAmount = parseFloat(amount);
    if (tradeAmount > demoBalance) {
      setMessage({ text: 'Insufficient balance', type: 'error' });
      return;
    }

    const currentTime = Date.now();
    const newTrade: Trade = {
      id: `trade_${currentTime}_${Math.random().toString(36).substr(2, 9)}`,
      direction,
      amount: tradeAmount,
      timeFrame: selectedTimeFrame.seconds,
      entryPrice: coin.price,
      startTime: currentTime,
      endTime: currentTime + (selectedTimeFrame.seconds * 1000),
      status: 'active',
      payout: tradeAmount * (1 + PAYOUT_PERCENTAGE / 100)
    };

    setActiveTrades(prev => [...prev, newTrade]);
    setDemoBalance(prev => prev - tradeAmount);
    setAmount('');
    setMessage({ 
      text: `Trade placed successfully! Direction: ${direction.toUpperCase()}, Duration: ${selectedTimeFrame.label}`, 
      type: 'success' 
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <GlassCard className="p-4" variant="light">
          {/* Time frame selection */}
          <div className="flex mb-4 gap-2">
            {TIME_FRAMES.map(tf => (
              <Button
                key={tf.label}
                variant={selectedTimeFrame.seconds === tf.seconds ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeFrame(tf)}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Chart */}
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <div ref={chartContainerRef} className="w-full h-[400px]" />
          </div>
        </GlassCard>

        {/* Active trades */}
        <GlassCard className="mt-6 p-6" variant="light">
          <h3 className="text-xl font-semibold mb-4">Active Trades</h3>
          <div className="space-y-4">
            {activeTrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active trades
              </div>
            ) : (
              activeTrades.map(trade => (
                <div
                  key={trade.id}
                  className={`p-4 rounded-lg border ${
                    trade.status === 'active' ? 'border-primary bg-primary/5' :
                    trade.status === 'won' ? 'border-green-500 bg-green-500/5' :
                    'border-red-500 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {trade.direction === 'up' ? (
                        <ArrowUp className="text-green-500" />
                      ) : (
                        <ArrowDown className="text-red-500" />
                      )}
                      <span className="font-medium">
                        {formatCurrency(trade.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      <span>{selectedTimeFrame.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Entry Price:</span>
                      <span className="ml-2">{formatCurrency(trade.entryPrice)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Price:</span>
                      <span className="ml-2">{formatCurrency(coin.price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Potential Payout:</span>
                      <span className="ml-2">{formatCurrency(trade.payout)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`ml-2 ${
                        trade.status === 'won' ? 'text-green-500' :
                        trade.status === 'lost' ? 'text-red-500' :
                        'text-primary'
                      }`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <div>
        {/* Trading form */}
        <GlassCard className="p-6" variant="light">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Fixed Time Trade</h3>
            <p className="text-lg font-bold">{formatCurrency(coin.price)}</p>
          </div>

          {message && (
            <div className={`p-3 mb-4 rounded-md ${
              message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 
              message.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{message.text}</p>
              </div>
            </div>
          )}

          {/* Direction selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Prediction</label>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors ${
                  direction === 'up'
                    ? 'bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-500/60'
                    : 'border-border hover:bg-background/80'
                }`}
                onClick={() => setDirection('up')}
              >
                <ArrowUp className={`h-6 w-6 ${
                  direction === 'up' ? 'text-green-600' : 'text-muted-foreground'
                }`} />
                <div className="mt-2 text-center">
                  <p className="font-medium">Price Up</p>
                  <p className="text-xs text-green-600">+{PAYOUT_PERCENTAGE}% Payout</p>
                </div>
              </div>
              <div
                className={`flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors ${
                  direction === 'down'
                    ? 'bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-500/60'
                    : 'border-border hover:bg-background/80'
                }`}
                onClick={() => setDirection('down')}
              >
                <ArrowDown className={`h-6 w-6 ${
                  direction === 'down' ? 'text-red-600' : 'text-muted-foreground'
                }`} />
                <div className="mt-2 text-center">
                  <p className="font-medium">Price Down</p>
                  <p className="text-xs text-red-600">+{PAYOUT_PERCENTAGE}% Payout</p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Investment Amount (₹)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                min="100"
                step="100"
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Min: ₹100</span>
              <span>Balance: {formatCurrency(demoBalance)}</span>
            </div>
          </div>

          {/* Potential payout */}
          <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Potential Payout</span>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">
              {amount ? formatCurrency(parseFloat(amount) * (1 + PAYOUT_PERCENTAGE / 100)) : '₹0.00'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {PAYOUT_PERCENTAGE}% return on successful prediction
            </div>
          </div>

          {/* Submit button */}
          <Button
            className="w-full"
            onClick={placeTrade}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              `Place ${direction.toUpperCase()} Trade for ${selectedTimeFrame.label}`
            )}
          </Button>
        </GlassCard>
      </div>
    </div>
  );
};

export default FixedTimeTrading; 