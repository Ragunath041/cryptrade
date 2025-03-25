
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Share2, Star, TrendingUp, TrendingDown, DollarSign, BarChart3, Globe, Info } from "lucide-react";
import { API } from "@/lib/api";
import { Coin, ChartData } from "@/lib/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PriceChart from "@/components/shared/PriceChart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";

const CoinDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [coin, setCoin] = useState<Coin | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchCoinData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const coinData = await API.getCoin(id);
        if (coinData) {
          setCoin(coinData);
          const chartData = await API.getCoinChartData(id, 30);
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

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 md:px-6 pt-28 pb-16">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted/30 rounded-lg w-1/4"></div>
            <div className="h-40 bg-muted/30 rounded-lg"></div>
            <div className="h-80 bg-muted/30 rounded-lg"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 md:px-6 pt-28 pb-16 text-center">
          <h2 className="text-2xl font-semibold mb-4">Coin not found</h2>
          <p className="text-muted-foreground mb-8">The cryptocurrency you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/market">Back to Market</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-28 pb-16">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/market">
              <ArrowLeft size={18} />
              <span className="ml-2">Back</span>
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden">
              <img src={coin.image} alt={coin.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{coin.name}</h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="font-medium">{coin.symbol.toUpperCase()}</span>
                {coin.rank && <span className="text-xs px-2 py-1 bg-muted rounded-full">Rank #{coin.rank}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full">
              <Star size={16} className="mr-1" />
              <span>Watchlist</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full">
              <Share2 size={16} className="mr-1" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="md:col-span-2">
            <GlassCard className="p-6" variant="light">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold">{formatPrice(coin.price)}</h2>
                  <div className={`flex items-center gap-2 mt-2 ${coin.change24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {coin.change24h >= 0 ? (
                      <TrendingUp size={18} />
                    ) : (
                      <TrendingDown size={18} />
                    )}
                    <span className="font-medium">{formatPercentage(coin.change24h)}</span>
                    <span className="text-muted-foreground text-sm">(24h)</span>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0">
                  <Button className="rounded-full bg-primary text-primary-foreground">
                    Trade {coin.symbol.toUpperCase()}
                  </Button>
                </div>
              </div>

              <PriceChart 
                data={chartData} 
                coinId={coin.id} 
                coinName={coin.name} 
                color={coin.change24h >= 0 ? "#16a34a" : "#dc2626"} 
              />
            </GlassCard>
          </div>

          <div>
            <GlassCard className="p-6" variant="light">
              <h3 className="text-lg font-medium mb-4">Market Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-medium">${formatNumber(coin.marketCap)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-muted-foreground">24h Volume</span>
                  <span className="font-medium">${formatNumber(coin.volume24h)}</span>
                </div>
                {coin.supply && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-muted-foreground">Circulating Supply</span>
                      <span className="font-medium">{formatNumber(coin.supply.circulating)} {coin.symbol.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-border">
                      <span className="text-muted-foreground">Total Supply</span>
                      <span className="font-medium">{formatNumber(coin.supply.total)} {coin.symbol.toUpperCase()}</span>
                    </div>
                    {coin.supply.max && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Max Supply</span>
                        <span className="font-medium">{formatNumber(coin.supply.max)} {coin.symbol.toUpperCase()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview" className="text-sm px-4 py-2">Overview</TabsTrigger>
            <TabsTrigger value="markets" className="text-sm px-4 py-2">Markets</TabsTrigger>
            <TabsTrigger value="news" className="text-sm px-4 py-2">News</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <GlassCard className="p-6" variant="light">
                  <h3 className="text-xl font-medium mb-4">About {coin.name}</h3>
                  <p className="text-muted-foreground leading-relaxed">{coin.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Official Website</h4>
                        <a href="#" className="text-primary hover:underline">https://{coin.id}.org</a>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                        <Info size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Whitepaper</h4>
                        <a href="#" className="text-primary hover:underline">View Whitepaper</a>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                        <BarChart3 size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Explorer</h4>
                        <a href="#" className="text-primary hover:underline">Blockchain Explorer</a>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium">Price Oracle</h4>
                        <a href="#" className="text-primary hover:underline">View Price Feeds</a>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
              
              <div>
                <GlassCard className="p-6" variant="light">
                  <h3 className="text-xl font-medium mb-4">Price Alerts</h3>
                  <p className="text-muted-foreground text-sm mb-6">Get notified when the price of {coin.name} hits your target.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Alert Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                        <input 
                          type="number" 
                          placeholder="Enter price" 
                          className="pl-8 pr-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Alert Type</label>
                      <select className="px-4 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option>Above Target Price</option>
                        <option>Below Target Price</option>
                      </select>
                    </div>
                    
                    <Button className="w-full">Create Alert</Button>
                  </div>
                </GlassCard>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="markets">
            <GlassCard className="p-6" variant="light">
              <h3 className="text-xl font-medium mb-6">Markets for {coin.name}</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Exchange</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pair</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">24h Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 1, exchange: "Binance", pair: `${coin.symbol.toUpperCase()}/USDT`, price: coin.price * 0.999, volume: coin.volume24h * 0.3 },
                      { id: 2, exchange: "Coinbase", pair: `${coin.symbol.toUpperCase()}/USD`, price: coin.price * 1.001, volume: coin.volume24h * 0.25 },
                      { id: 3, exchange: "Kraken", pair: `${coin.symbol.toUpperCase()}/USD`, price: coin.price * 0.998, volume: coin.volume24h * 0.15 },
                      { id: 4, exchange: "FTX", pair: `${coin.symbol.toUpperCase()}/USDT`, price: coin.price * 1.002, volume: coin.volume24h * 0.12 },
                      { id: 5, exchange: "Huobi", pair: `${coin.symbol.toUpperCase()}/USDT`, price: coin.price * 0.997, volume: coin.volume24h * 0.1 },
                    ].map((market) => (
                      <tr key={market.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-4">{market.id}</td>
                        <td className="py-4 px-4">{market.exchange}</td>
                        <td className="py-4 px-4">{market.pair}</td>
                        <td className="py-4 px-4 text-right">{formatPrice(market.price)}</td>
                        <td className="py-4 px-4 text-right">${formatNumber(market.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </TabsContent>
          
          <TabsContent value="news">
            <GlassCard className="p-6" variant="light">
              <h3 className="text-xl font-medium mb-6">Latest News for {coin.name}</h3>
              <div className="space-y-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-4 pb-6 border-b border-border last:border-0">
                    <div className="w-24 h-24 rounded-lg bg-muted/30 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium mb-2">Latest developments in {coin.name} ecosystem</h4>
                      <p className="text-muted-foreground text-sm mb-3">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla nec purus feugiat, molestie ipsum et, consequat nibh.
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>CryptoNews</span>
                        <span>2 hours ago</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default CoinDetails;
