
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Clock, ArrowRight, AlertCircle, ExternalLink } from "lucide-react";
import { API } from "@/lib/api";
import { UserProfile, PortfolioAsset } from "@/lib/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("portfolio");
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const userData = await API.getUserProfile();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [toast]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  // Calculate portfolio stats
  const portfolioStats = {
    totalValue: user?.portfolio.reduce((acc, asset) => acc + asset.valueUSD, 0) || 0,
    totalProfit: user?.portfolio.reduce((acc, asset) => acc + asset.profitLoss, 0) || 0,
  };

  // Convert portfolio to pie chart data
  const pieChartData = user?.portfolio.map((asset) => ({
    name: asset.coinId,
    value: asset.valueUSD,
  })) || [];

  // Profit and loss bar chart data
  const profitLossData = user?.portfolio.map((asset) => ({
    name: asset.coinId.substring(0, 3).toUpperCase(),
    value: asset.profitLoss,
    percentage: asset.profitLossPercentage,
  })) || [];

  // Colors for pie chart
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#FFBB28"];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-28 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name || "User"}</p>
          </div>
          <div className="flex gap-3">
            <Button className="rounded-full">
              <DollarSign size={18} className="mr-2" />
              Deposit
            </Button>
            <Button variant="outline" className="rounded-full">
              <Wallet size={18} className="mr-2" />
              Withdraw
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard className="p-6 relative overflow-hidden group" variant="light">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full transition-transform duration-500 group-hover:scale-150"></div>
              <div className="relative z-10">
                <h3 className="text-muted-foreground">Total Balance</h3>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(user?.balance.available + user?.balance.locked || 0)}
                </p>
                <div className="flex justify-between mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="font-medium">{formatCurrency(user?.balance.available || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Locked</p>
                    <p className="font-medium">{formatCurrency(user?.balance.locked || 0)}</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 relative overflow-hidden group" variant="light">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full transition-transform duration-500 group-hover:scale-150"></div>
              <div className="relative z-10">
                <h3 className="text-muted-foreground">Portfolio Value</h3>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(portfolioStats.totalValue)}
                </p>
                <div className="flex items-center mt-4">
                  <span 
                    className={`flex items-center gap-1 text-sm font-medium ${
                      portfolioStats.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {portfolioStats.totalProfit >= 0 ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )}
                    {formatCurrency(Math.abs(portfolioStats.totalProfit))}
                    {" "}
                    ({((portfolioStats.totalProfit / portfolioStats.totalValue) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 relative overflow-hidden group" variant="light">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full transition-transform duration-500 group-hover:scale-150"></div>
              <div className="relative z-10">
                <h3 className="text-muted-foreground">Assets</h3>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-3xl font-bold">{user?.portfolio.length || 0}</p>
                  <p className="text-muted-foreground">Cryptocurrencies</p>
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/market">
                      Discover More
                      <ArrowRight size={14} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        <Tabs defaultValue="portfolio" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="portfolio" className="text-sm md:text-base px-4 py-2">Portfolio</TabsTrigger>
            <TabsTrigger value="transactions" className="text-sm md:text-base px-4 py-2">Transactions</TabsTrigger>
            <TabsTrigger value="watchlist" className="text-sm md:text-base px-4 py-2">Watchlist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="portfolio">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <GlassCard className="p-6" variant="light">
                  <h3 className="text-xl font-medium mb-6">Your Assets</h3>
                  
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-16 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-xl"></div>
                      ))}
                    </div>
                  ) : user?.portfolio.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="text-lg font-medium mb-2">No Assets Found</h4>
                      <p className="text-muted-foreground mb-6">You don't have any cryptocurrency assets yet.</p>
                      <Button asChild>
                        <Link to="/market">Explore Market</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Asset</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Balance</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Value</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Profit/Loss</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {user?.portfolio.map((asset: PortfolioAsset) => (
                            <tr key={asset.coinId} className="border-b border-border hover:bg-muted/10 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted"></div>
                                  <div>
                                    <p className="font-medium">{asset.coinId.charAt(0).toUpperCase() + asset.coinId.slice(1)}</p>
                                    <p className="text-xs text-muted-foreground">{asset.coinId.substring(0, 3).toUpperCase()}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <p>{asset.amount} {asset.coinId.substring(0, 3).toUpperCase()}</p>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <p>{formatCurrency(asset.averageBuyPrice)}</p>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <p>{formatCurrency(asset.valueUSD)}</p>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <p className={asset.profitLoss >= 0 ? "text-green-600" : "text-red-600"}>
                                  {formatCurrency(asset.profitLoss)} ({asset.profitLossPercentage}%)
                                </p>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                                    <Link to={`/trading/${asset.coinId}`}>Trade</Link>
                                  </Button>
                                  <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                                    <Link to={`/coin/${asset.coinId}`}>
                                      <ExternalLink size={14} />
                                    </Link>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
                
                <GlassCard className="p-6 mt-8" variant="light">
                  <h3 className="text-xl font-medium mb-6">Profit & Loss</h3>
                  
                  {isLoading || !user?.portfolio.length ? (
                    <div className="h-64 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-xl"></div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={profitLossData}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                          <YAxis 
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            tickFormatter={(value) => `$${Math.abs(value)}`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <GlassCard className="p-3 !bg-background/80" variant="light">
                                    <p className="font-medium">{data.name}</p>
                                    <p className={data.value >= 0 ? "text-green-600" : "text-red-600"}>
                                      {formatCurrency(data.value)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {data.percentage >= 0 ? "+" : ""}{data.percentage}%
                                    </p>
                                  </GlassCard>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="value"
                            fill={(entry) => (entry.value >= 0 ? "#16a34a" : "#dc2626")}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </GlassCard>
              </div>
              
              <div>
                <GlassCard className="p-6" variant="light">
                  <h3 className="text-xl font-medium mb-6">Portfolio Allocation</h3>
                  
                  {isLoading || !user?.portfolio.length ? (
                    <div className="h-64 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-xl"></div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name.substring(0, 3).toUpperCase()} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <GlassCard className="p-3 !bg-background/80" variant="light">
                                    <p className="font-medium">{data.name.charAt(0).toUpperCase() + data.name.slice(1)}</p>
                                    <p>{formatCurrency(data.value)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {((data.value / portfolioStats.totalValue) * 100).toFixed(2)}% of portfolio
                                    </p>
                                  </GlassCard>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </GlassCard>
                
                <GlassCard className="p-6 mt-8" variant="light">
                  <h3 className="text-xl font-medium mb-6">Recent Activity</h3>
                  
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-16 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-xl"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {user?.orders.map((order, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                          <div className={`p-2 rounded-full ${order.type === "buy" ? "bg-green-100" : "bg-red-100"}`}>
                            <DollarSign size={16} className={order.type === "buy" ? "text-green-600" : "text-red-600"} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="font-medium">
                                {order.type === "buy" ? "Bought" : "Sold"} {order.coinId.substring(0, 3).toUpperCase()}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                {order.amount} {order.coinId.substring(0, 3).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>${order.price.toLocaleString()}</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(order.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="text-center mt-4">
                        <Button variant="ghost" size="sm" className="text-xs">
                          View All Activity
                          <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="transactions">
            <GlassCard className="p-6" variant="light">
              <h3 className="text-xl font-medium mb-6">Transaction History</h3>
              
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full">All</Button>
                  <Button variant="ghost" size="sm" className="rounded-full">Deposits</Button>
                  <Button variant="ghost" size="sm" className="rounded-full">Withdrawals</Button>
                  <Button variant="ghost" size="sm" className="rounded-full">Trades</Button>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="pl-4 pr-4 py-2 rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-full max-w-xs"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Asset</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { type: "Buy", asset: "Bitcoin", amount: "0.05 BTC", value: "$3,250.00", status: "Completed", date: "2023-06-15" },
                      { type: "Sell", asset: "Ethereum", amount: "1.2 ETH", value: "$4,224.00", status: "Completed", date: "2023-06-14" },
                      { type: "Deposit", asset: "USD", amount: "$5,000.00", value: "$5,000.00", status: "Completed", date: "2023-06-12" },
                      { type: "Buy", asset: "Solana", amount: "10 SOL", value: "$1,425.00", status: "Completed", date: "2023-06-10" },
                      { type: "Withdrawal", asset: "USD", amount: "$2,000.00", value: "$2,000.00", status: "Completed", date: "2023-06-05" },
                    ].map((tx, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-4">
                          <span 
                            className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
                              tx.type === "Buy" ? "bg-green-100 text-green-700" :
                              tx.type === "Sell" ? "bg-red-100 text-red-700" :
                              tx.type === "Deposit" ? "bg-blue-100 text-blue-700" :
                              "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium">{tx.asset}</p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className="font-medium">{tx.amount}</p>
                          <p className="text-xs text-muted-foreground">{tx.value}</p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p>{tx.date}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <span className="text-sm text-muted-foreground">Page 1 of 1</span>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </GlassCard>
          </TabsContent>
          
          <TabsContent value="watchlist">
            <GlassCard className="p-6" variant="light">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium">Your Watchlist</h3>
                <Button size="sm" className="rounded-full">
                  Add Coin
                </Button>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-16 bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer rounded-xl"></div>
                  ))}
                </div>
              ) : user?.watchlist.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium mb-2">No Coins in Watchlist</h4>
                  <p className="text-muted-foreground mb-6">Add coins to your watchlist to monitor their prices.</p>
                  <Button asChild>
                    <Link to="/market">Explore Market</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {user?.watchlist.map((coinId, index) => {
                    // Find coin data
                    const coin = {
                      id: coinId,
                      name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
                      symbol: coinId.substring(0, 3).toUpperCase(),
                      price: coinId === "bitcoin" ? 65432.78 : 
                              coinId === "ethereum" ? 3562.14 :
                              coinId === "solana" ? 143.76 : 
                              coinId === "cardano" ? 0.4321 : 100,
                      change24h: coinId === "bitcoin" ? 2.34 :
                                coinId === "ethereum" ? 1.25 :
                                coinId === "solana" ? 5.63 :
                                coinId === "cardano" ? 1.23 : 0,
                    };
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted"></div>
                          <div>
                            <p className="font-medium">{coin.name}</p>
                            <p className="text-xs text-muted-foreground">{coin.symbol}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-medium">${coin.price.toLocaleString()}</p>
                            <p className={`text-xs flex items-center justify-end ${
                              coin.change24h >= 0 ? "text-green-600" : "text-red-600"
                            }`}>
                              {coin.change24h >= 0 ? (
                                <TrendingUp size={12} className="mr-1" />
                              ) : (
                                <TrendingDown size={12} className="mr-1" />
                              )}
                              {coin.change24h >= 0 ? "+" : ""}
                              {coin.change24h.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs">
                              <Link to={`/trading/${coin.id}`}>Trade</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
