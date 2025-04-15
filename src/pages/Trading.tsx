import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "@/lib/api";
import { Coin } from "@/lib/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { GlassCard } from "@/components/ui/glass-card";
import FixedTimeTrading from "@/components/trading/FixedTimeTrading";
import { useToast } from "@/components/ui/use-toast";

const Trading: React.FC = () => {
  const { id = "bitcoin" } = useParams<{ id?: string }>();
  const [coin, setCoin] = useState<Coin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [topCoins, setTopCoins] = useState<Coin[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch the specific coin
        const coinData = await API.getCoin(id);
        if (coinData) {
          setCoin(coinData);
        } else {
          toast({
            title: "Coin not found",
            description: "The requested cryptocurrency could not be found.",
            variant: "destructive",
          });
          navigate("/trading/bitcoin");
        }

        // Fetch top coins for the sidebar
        const topCoinsData = await API.getCoins();
        setTopCoins(topCoinsData.slice(0, 10));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load trading data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [id, navigate, toast]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-28 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Coin selector sidebar */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6" variant="light">
              <h2 className="text-xl font-semibold mb-4">Top Coins</h2>
              <div className="space-y-2">
                {isLoading ? (
                  // Skeleton loader for top coins
                  Array.from({ length: 10 }).map((_, index) => (
                    <div 
                      key={index} 
                      className="h-10 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-lg"
                    ></div>
                  ))
                ) : (
                  topCoins.map((topCoin) => (
                    <div 
                      key={topCoin.id}
                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        topCoin.id === id 
                          ? 'bg-primary/10 text-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => navigate(`/trading/${topCoin.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={topCoin.image} 
                          alt={topCoin.name} 
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{topCoin.symbol}</span>
                      </div>
                      <div className={`text-sm ${
                        topCoin.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {topCoin.change24h >= 0 ? '+' : ''}{topCoin.change24h.toFixed(2)}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          {/* Main trading area */}
          <div className="lg:col-span-3">
            {isLoading ? (
              // Skeleton loader for trading interface
              <div className="space-y-6">
                <div className="h-12 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-lg w-1/3"></div>
                <div className="h-96 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-lg"></div>
                <div className="h-64 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-lg"></div>
              </div>
            ) : coin ? (
              <div>
                <div className="mb-6">
                  <h1 className="text-3xl font-bold flex items-center gap-4">
                    <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                    {coin.name} ({coin.symbol})
                    <span className={`text-xl ${coin.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </span>
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Predict {coin.name} price movements and earn up to 85% returns in minutes
                  </p>
                </div>

                <FixedTimeTrading coin={coin} />
              </div>
            ) : (
              <div className="text-center py-20">
                <h2 className="text-2xl font-semibold mb-4">Coin not found</h2>
                <p className="text-muted-foreground">
                  The cryptocurrency you're looking for couldn't be found.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Trading;
