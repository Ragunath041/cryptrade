import React, { useState, useEffect, useRef } from 'react';
import { createChart, IChartApi, UTCTimestamp, DeepPartial, ChartOptions, HistogramData, ColorType } from 'lightweight-charts';
import { ArrowUp, ArrowDown, AlertCircle, Wallet, DollarSign, Clock } from 'lucide-react';
import { API } from '@/lib/api';
import { Coin, DemoPosition } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';

interface TradingInterfaceProps {
  coin: Coin;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ coin }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [interval, setInterval] = useState<string>('1d');
  const [chartData, setChartData] = useState<any[]>([]);
  const [orderType, setOrderType] = useState<'buy' | 'sell' | 'long' | 'short'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(1);
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [demoAccount, setDemoAccount] = useState(API.getDemoAccount());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [openPositions, setOpenPositions] = useState<DemoPosition[]>([]);

  // Fetch chart data and update demo account
  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        const data = await API.getIntradayData(coin.id, interval);
        setChartData(data);
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setMessage({ 
          text: 'Failed to load chart data', 
          type: 'error' 
        });
      } finally {
        setIsLoading(false);
      }
    };

    const updateDemoAccount = async () => {
      await API.updateDemoPrices();
      setDemoAccount(API.getDemoAccount());
      setOpenPositions(API.getDemoAccount().openPositions.filter(
        pos => pos.coinId === coin.id && pos.status === 'open'
      ));
    };

    fetchChartData();
    updateDemoAccount();

    // Set up interval to update demo account
    const intervalId = setInterval(updateDemoAccount, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [coin.id, interval]);

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
          secondsVisible: false,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
      };

      const newChart = createChart(chartContainerRef.current, chartOptions);

      const candlestickSeries = newChart.addCandlestickSeries({
        upColor: '#16a34a',
        downColor: '#dc2626',
        borderVisible: false,
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
      });

      candlestickSeries.setData(chartData);

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

      // Create volume data from candlestick data
      const volumeData = chartData.map(item => ({
        time: item.time,
        value: Math.random() * 1000, // Placeholder volume data
        color: item.close >= item.open ? '#16a34a' : '#dc2626',
      }));

      volumeSeries.setData(volumeData);

      newChart.timeScale().fitContent();
      
      const handleResize = () => {
        if (chartContainerRef.current) {
          newChart.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
        }
      };

      window.addEventListener('resize', handleResize);
      setChart(newChart);

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
      candlestickSeries.setData(chartData);
      
      if (chart.series()[1]) {
        const volumeSeries = chart.series()[1];
        const volumeData: HistogramData[] = chartData.map(item => ({
          time: item.time,
          value: Math.random() * 1000, // Placeholder volume data
          color: item.close >= item.open ? '#16a34a' : '#dc2626',
        }));
        volumeSeries.setData(volumeData);
      }
      
      chart.timeScale().fitContent();
    }
  }, [chartData, chart]);

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
  };

  const calculateTotal = () => {
    if (!amount || isNaN(parseFloat(amount))) return 0;
    return parseFloat(amount) * coin.price;
  };

  const executeTrade = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const amountValue = parseFloat(amount);
      const takeProfitValue = takeProfit ? parseFloat(takeProfit) : undefined;
      const stopLossValue = stopLoss ? parseFloat(stopLoss) : undefined;

      if (takeProfitValue && stopLossValue) {
        if (orderType === 'long' && takeProfitValue <= coin.price) {
          setMessage({ text: 'Take profit must be higher than current price for long positions', type: 'error' });
          setIsLoading(false);
          return;
        }
        if (orderType === 'long' && stopLossValue >= coin.price) {
          setMessage({ text: 'Stop loss must be lower than current price for long positions', type: 'error' });
          setIsLoading(false);
          return;
        }
        if (orderType === 'short' && takeProfitValue >= coin.price) {
          setMessage({ text: 'Take profit must be lower than current price for short positions', type: 'error' });
          setIsLoading(false);
          return;
        }
        if (orderType === 'short' && stopLossValue <= coin.price) {
          setMessage({ text: 'Stop loss must be higher than current price for short positions', type: 'error' });
          setIsLoading(false);
          return;
        }
      }

      const result = await API.executeDemoTrade(
        coin.id,
        coin.symbol,
        orderType,
        coin.price,
        amountValue,
        leverage,
        takeProfitValue,
        stopLossValue
      );

      setDemoAccount(API.getDemoAccount());
      setOpenPositions(API.getDemoAccount().openPositions.filter(
        pos => pos.coinId === coin.id && pos.status === 'open'
      ));
      
      setMessage({ 
        text: `Successfully ${orderType === 'buy' ? 'bought' : 
                          orderType === 'sell' ? 'sold' : 
                          orderType === 'long' ? 'opened long position for' : 
                          'opened short position for'} ${amountValue} ${coin.symbol}`, 
        type: 'success' 
      });
      
      // Reset form
      setAmount('');
      setTakeProfit('');
      setStopLoss('');
    } catch (error: any) {
      setMessage({ 
        text: error.message || 'Failed to execute trade', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closePosition = async (positionId: string) => {
    setIsLoading(true);
    try {
      await API.closeDemoPosition(positionId);
      setDemoAccount(API.getDemoAccount());
      setOpenPositions(API.getDemoAccount().openPositions.filter(
        pos => pos.coinId === coin.id && pos.status === 'open'
      ));
      setMessage({ text: 'Position closed successfully', type: 'success' });
    } catch (error: any) {
      setMessage({ 
        text: error.message || 'Failed to close position', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemoAccount = () => {
    API.resetDemoAccount();
    setDemoAccount(API.getDemoAccount());
    setOpenPositions([]);
    setMessage({ text: 'Demo account reset successfully', type: 'success' });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <GlassCard className="p-4 relative" variant="light">
          {/* Chart settings */}
          <div className="flex mb-4 gap-2">
            <Button 
              variant={interval === '5m' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleIntervalChange('5m')}
            >
              5m
            </Button>
            <Button 
              variant={interval === '1h' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleIntervalChange('1h')}
            >
              1h
            </Button>
            <Button 
              variant={interval === '4h' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleIntervalChange('4h')}
            >
              4h
            </Button>
            <Button 
              variant={interval === '1d' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleIntervalChange('1d')}
            >
              1d
            </Button>
          </div>

          {/* Chart */}
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            <div ref={chartContainerRef} className="w-full h-[500px]" />
          </div>
        </GlassCard>

        {/* Open positions */}
        <GlassCard className="p-6 mt-6" variant="light">
          <h3 className="text-xl font-semibold mb-4">Open Positions for {coin.symbol}</h3>
          
          {openPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No open positions for {coin.symbol}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-4 text-left">Type</th>
                    <th className="py-2 px-4 text-right">Amount</th>
                    <th className="py-2 px-4 text-right">Entry Price</th>
                    <th className="py-2 px-4 text-right">Current Price</th>
                    <th className="py-2 px-4 text-right">Take Profit</th>
                    <th className="py-2 px-4 text-right">Stop Loss</th>
                    <th className="py-2 px-4 text-right">P&L</th>
                    <th className="py-2 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((position) => (
                    <tr key={position.id} className="border-b border-border">
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          position.type === 'long' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                        }`}>
                          {position.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        {position.amount} {position.symbol}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {formatCurrency(position.entryPrice)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {position.takeProfit ? formatCurrency(position.takeProfit) : '-'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {position.stopLoss ? formatCurrency(position.stopLoss) : '-'}
                      </td>
                      <td className={`py-2 px-4 text-right ${
                        position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(position.profitLoss)} ({position.profitLossPercentage.toFixed(2)}%)
                      </td>
                      <td className="py-2 px-4 text-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => closePosition(position.id)}
                          disabled={isLoading}
                        >
                          Close
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>

      <div>
        {/* Trading form */}
        <GlassCard className="p-6" variant="light">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Trade {coin.symbol}</h3>
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

          {/* Trade type selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Order Type</label>
            <div className="grid grid-cols-2 gap-2">
              <div 
                className={`flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors ${
                  orderType === 'buy' || orderType === 'long'
                    ? 'bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-500/60' 
                    : 'border-border hover:bg-background/80'
                }`}
                onClick={() => setOrderType(orderType === 'buy' ? 'long' : 'buy')}
              >
                <ArrowUp className={`h-6 w-6 ${
                  orderType === 'buy' || orderType === 'long'
                    ? 'text-green-600' 
                    : 'text-muted-foreground'
                }`} />
                <div className="mt-2 text-center">
                  <p className="font-medium">{orderType === 'buy' ? 'Buy' : 'Long'}</p>
                  <p className="text-xs text-muted-foreground">
                    {orderType === 'buy' ? 'Spot' : 'Margin'}
                  </p>
                </div>
              </div>
              <div 
                className={`flex flex-col items-center p-3 border rounded-md cursor-pointer transition-colors ${
                  orderType === 'sell' || orderType === 'short'
                    ? 'bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-500/60' 
                    : 'border-border hover:bg-background/80'
                }`}
                onClick={() => setOrderType(orderType === 'sell' ? 'short' : 'sell')}
              >
                <ArrowDown className={`h-6 w-6 ${
                  orderType === 'sell' || orderType === 'short'
                    ? 'text-red-600' 
                    : 'text-muted-foreground'
                }`} />
                <div className="mt-2 text-center">
                  <p className="font-medium">{orderType === 'sell' ? 'Sell' : 'Short'}</p>
                  <p className="text-xs text-muted-foreground">
                    {orderType === 'sell' ? 'Spot' : 'Margin'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Amount ({coin.symbol})</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter ${coin.symbol} amount`}
                className="w-full p-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                min="0"
                step="0.001"
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Total: {formatCurrency(calculateTotal())}</span>
              <span>Balance: {formatCurrency(demoAccount.balance)}</span>
            </div>
          </div>

          {/* Leverage (for margin trading) */}
          {(orderType === 'long' || orderType === 'short') && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Leverage (x{leverage})</label>
              <input
                type="range"
                min="1"
                max="20"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs">
                <span>1x</span>
                <span>5x</span>
                <span>10x</span>
                <span>15x</span>
                <span>20x</span>
              </div>
            </div>
          )}

          {/* Take profit and stop loss (for margin trading) */}
          {(orderType === 'long' || orderType === 'short') && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Take Profit (Optional)</label>
                <input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder={`Price to close with profit`}
                  className="w-full p-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Stop Loss (Optional)</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder={`Price to close with loss`}
                  className="w-full p-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  min="0"
                  step="0.01"
                />
              </div>
            </>
          )}

          {/* Submit button */}
          <Button
            className="w-full mb-4"
            onClick={executeTrade}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              orderType === 'buy' ? 'Buy' : 
              orderType === 'sell' ? 'Sell' : 
              orderType === 'long' ? 'Open Long Position' : 
              'Open Short Position'
            )}
          </Button>

          {/* Demo account info */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wallet className="h-5 w-5 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Demo Balance</span>
              </div>
              <span className="font-bold">{formatCurrency(demoAccount.balance)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Portfolio Value</span>
              </div>
              <span className="font-bold">
                {formatCurrency(demoAccount.portfolio.reduce((sum, asset) => sum + asset.valueUSD, 0))}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Open Positions</span>
              </div>
              <span className="font-bold">{demoAccount.openPositions.length}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4" 
              onClick={resetDemoAccount}
            >
              Reset Demo Account
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default TradingInterface; 