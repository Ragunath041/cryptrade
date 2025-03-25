
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { TrendingUp, TrendingDown, DollarSign, Clock, Activity } from "lucide-react";
import { API } from "@/lib/api";
import { Coin, ChartData } from "@/lib/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PriceChart from "@/components/shared/PriceChart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";

const Trading: React.FC = () => {
  const { id = "bitcoin" } = useParams<{ id?: string }>();
  const [coin, setCoin] = useState<Coin | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCoinData = async () => {
      setIsLoading(true);
      try {
        const coinData = await API.getCoin(id);
        if (coinData) {
          setCoin(coinData);
          setPrice(coinData.price.toString());
          const chartData = await API.getCoinChartData(id, 7);
          setChartData(chartData);
        }
      } catch (error) {
        console.error("Error fetching coin data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoinData();
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [id]);

  // Calculate total order value
  useEffect(() => {
    if (price && amount) {
      setTotal(parseFloat(price) * parseFloat(amount));
    } else {
      setTotal(0);
    }
  }, [price, amount]);

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!price || !amount) {
      toast({
        title: "Error",
        description: "Please enter both price and amount",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Order Placed",
      description: `Your ${orderType} order has been submitted successfully`,
    });
    
    // Reset form
    setAmount("");
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-28 pb-16">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Trading Platform</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <GlassCard className="p-6 mb-8" variant="light">
              {isLoading ? (
                <div className="animate-pulse w-full h-[400px] bg-muted/30 rounded-lg"></div>
              ) : coin ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img src={coin.image} alt={coin.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{coin.name}</h2>
                        <span className="text-muted-foreground">{coin.symbol.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold">${coin.price.toLocaleString()}</h3>
                        <span 
                          className={`flex items-center gap-1 text-sm font-medium ${
                            coin.change24h >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {coin.change24h >= 0 ? (
                            <TrendingUp size={16} />
                          ) : (
                            <TrendingDown size={16} />
                          )}
                          {coin.change24h >= 0 ? "+" : ""}
                          {coin.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <PriceChart 
                    data={chartData} 
                    coinId={coin.id} 
                    coinName={coin.name} 
                    color={coin.change24h >= 0 ? "#16a34a" : "#dc2626"} 
                  />
                </>
              ) : (
                <div className="text-center py-20">
                  <h3 className="text-xl font-medium mb-2">Coin not found</h3>
                  <p className="text-muted-foreground">The cryptocurrency you're looking for doesn't exist.</p>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-6" variant="light">
              <h3 className="text-xl font-medium mb-6">Order Book</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-3">Sell Orders</h4>
                  <div className="space-y-2">
                    {[...Array(5)].map((_, index) => {
                      const price = coin ? coin.price * (1 + (0.01 * (index + 1))) : 0;
                      const amount = (Math.random() * 2 + 0.1).toFixed(4);
                      return (
                        <div key={`sell-${index}`} className="flex justify-between items-center py-1 border-b border-border">
                          <span className="text-red-600">${price.toLocaleString()}</span>
                          <span className="text-muted-foreground">{amount}</span>
                          <span className="text-muted-foreground">${(price * parseFloat(amount)).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-3">Buy Orders</h4>
                  <div className="space-y-2">
                    {[...Array(5)].map((_, index) => {
                      const price = coin ? coin.price * (1 - (0.01 * (index + 1))) : 0;
                      const amount = (Math.random() * 2 + 0.1).toFixed(4);
                      return (
                        <div key={`buy-${index}`} className="flex justify-between items-center py-1 border-b border-border">
                          <span className="text-green-600">${price.toLocaleString()}</span>
                          <span className="text-muted-foreground">{amount}</span>
                          <span className="text-muted-foreground">${(price * parseFloat(amount)).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div>
            <GlassCard className="p-6 mb-8" variant="light">
              <h3 className="text-xl font-medium mb-6">Place Order</h3>
              
              <Tabs defaultValue="buy" onValueChange={(value) => setOrderType(value as "buy" | "sell")}>
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="buy" className="flex-1 py-2 text-center data-[state=active]:bg-green-600 data-[state=active]:text-white">
                    Buy
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="flex-1 py-2 text-center data-[state=active]:bg-red-600 data-[state=active]:text-white">
                    Sell
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="buy" className="mt-0">
                  <form onSubmit={handleOrderSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="pl-8 pr-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={price}
                            onChange={handlePriceChange}
                            step="0.01"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Amount</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="px-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={amount}
                            onChange={handleAmountChange}
                            step="0.0001"
                            min="0"
                            required
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            {coin?.symbol.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Total</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <input 
                            type="text" 
                            className="pl-8 pr-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            readOnly
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        Buy {coin?.symbol.toUpperCase()}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="sell" className="mt-0">
                  <form onSubmit={handleOrderSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="pl-8 pr-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={price}
                            onChange={handlePriceChange}
                            step="0.01"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Amount</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="px-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={amount}
                            onChange={handleAmountChange}
                            step="0.0001"
                            min="0"
                            required
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            {coin?.symbol.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Total</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <input 
                            type="text" 
                            className="pl-8 pr-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            readOnly
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sell {coin?.symbol.toUpperCase()}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </GlassCard>

            <GlassCard className="p-6" variant="light">
              <h3 className="text-xl font-medium mb-6">My Orders</h3>
              
              <Tabs defaultValue="open">
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="open" className="flex-1">Open</TabsTrigger>
                  <TabsTrigger value="filled" className="flex-1">Filled</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="open">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="p-2 rounded-full bg-green-100">
                        <DollarSign size={18} className="text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Buy BTC</span>
                          <span className="text-muted-foreground text-sm">0.5 BTC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">$65,000.00</span>
                          <span className="text-muted-foreground">$32,500.00</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">Cancel</Button>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="p-2 rounded-full bg-red-100">
                        <DollarSign size={18} className="text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Sell ETH</span>
                          <span className="text-muted-foreground text-sm">2.0 ETH</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">$3,600.00</span>
                          <span className="text-muted-foreground">$7,200.00</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">Cancel</Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="filled">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="p-2 rounded-full bg-green-100">
                        <Activity size={18} className="text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Bought BTC</span>
                          <span className="text-muted-foreground text-sm">0.1 BTC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">$64,500.00</span>
                          <span className="text-muted-foreground">$6,450.00</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Clock size={14} className="inline mr-1" />
                        1h ago
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="history">
                  <div className="space-y-4">
                    {[
                      { type: "Bought", coin: "BTC", amount: "0.05", price: "63,240.00", total: "3,162.00", time: "2d ago" },
                      { type: "Sold", coin: "ETH", amount: "1.2", price: "3,520.00", total: "4,224.00", time: "3d ago" },
                      { type: "Bought", coin: "SOL", amount: "10.0", price: "142.50", total: "1,425.00", time: "5d ago" },
                    ].map((order, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                        <div className={`p-2 rounded-full ${order.type === "Bought" ? "bg-green-100" : "bg-red-100"}`}>
                          <Activity 
                            size={18} 
                            className={order.type === "Bought" ? "text-green-600" : "text-red-600"}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {order.type} {order.coin}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {order.amount} {order.coin}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">${order.price}</span>
                            <span className="text-muted-foreground">${order.total}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <Clock size={14} className="inline mr-1" />
                          {order.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </GlassCard>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Trading;
