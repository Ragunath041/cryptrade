import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { API } from "@/lib/api";
import { Coin } from "@/lib/types";
import { Button } from "@/components/ui/button";
import CoinCard from "@/components/shared/CoinCard";
import { GlassCard } from "@/components/ui/glass-card";

const MarketOverview: React.FC = () => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const data = await API.getCoins();
        setCoins(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching coins:", error);
        setIsLoading(false);
      }
    };

    fetchCoins();
  }, []);

  const filteredCoins = coins.filter(
    (coin) =>
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedCoins = filteredCoins.slice(0, 8);

  // Calculate market stats
  const marketStats = {
    totalMarketCap: coins.reduce((acc, coin) => acc + coin.marketCap, 0),
    totalVolume: coins.reduce((acc, coin) => acc + coin.volume24h, 0),
    gainers: coins.filter((coin) => coin.change24h > 0),
    losers: coins.filter((coin) => coin.change24h < 0),
  };

  // Find top gainer and loser
  const topGainer = [...marketStats.gainers].sort((a, b) => b.change24h - a.change24h)[0];
  const topLoser = [...marketStats.losers].sort((a, b) => a.change24h - b.change24h)[0];

  return (
    <section className="py-20 md:py-32 bg-secondary/50 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Market Overview</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Track real-time cryptocurrency prices and market trends
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-10 justify-center">
          <GlassCard className="p-6 flex-1 max-w-md" variant="light">
            <h3 className="text-muted-foreground text-sm mb-2">Total Market Cap</h3>
            <p className="text-2xl font-bold">
              ${isLoading ? "..." : marketStats.totalMarketCap.toLocaleString()}
            </p>
          </GlassCard>
          
          <GlassCard className="p-6 flex-1 max-w-md" variant="light">
            <h3 className="text-muted-foreground text-sm mb-2">24h Trading Volume</h3>
            <p className="text-2xl font-bold">
              ${isLoading ? "..." : marketStats.totalVolume.toLocaleString()}
            </p>
          </GlassCard>
          
          <GlassCard className="p-6 flex-1 max-w-md" variant="light">
            <div className="flex justify-between">
              <div>
                <h3 className="text-muted-foreground text-sm mb-1">Top Gainer</h3>
                {topGainer && (
                  <div className="flex items-center gap-2">
                    <img src={topGainer.image} alt={topGainer.name} className="w-5 h-5 rounded-full" />
                    <p className="font-medium">{topGainer.symbol}</p>
                    <span className="text-green-600 flex items-center text-sm">
                      <ArrowUp size={14} />
                      {topGainer.change24h.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-muted-foreground text-sm mb-1">Top Loser</h3>
                {topLoser && (
                  <div className="flex items-center gap-2">
                    <img src={topLoser.image} alt={topLoser.name} className="w-5 h-5 rounded-full" />
                    <p className="font-medium">{topLoser.symbol}</p>
                    <span className="text-red-600 flex items-center text-sm">
                      <ArrowDown size={14} />
                      {Math.abs(topLoser.change24h).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-semibold">Top Cryptocurrencies</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search coins..."
              className="pl-10 pr-4 py-2 rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-full max-w-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-44 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-xl"
              ></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedCoins.map((coin, index) => (
                <CoinCard
                  key={coin.id}
                  coin={coin}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
              ))}
            </div>

            {coins.length > 8 && (
              <div className="text-center mt-12">
                <Button
                  onClick={() => navigate("/market")}
                  variant="outline"
                  className="rounded-full px-8 border-primary/20 hover:border-primary/80 hover:bg-primary/5"
                >
                  View All Cryptocurrencies
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default MarketOverview;
