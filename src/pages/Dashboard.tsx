import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Clock, ArrowRight, AlertCircle, ExternalLink, LogOut } from "lucide-react";
import { API } from "@/lib/api";
import { UserProfile, PortfolioAsset } from "@/lib/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/http";
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-2xl font-bold mb-4">Something went wrong:</h2>
      <pre className="text-red-500 mb-4">{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Try again
      </button>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("portfolio");
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // Get user data from API
        const userData = await API.getUserProfile();
        const portfolioData = await API.getPortfolio();
        
        setUser(userData);
        setPortfolio(portfolioData);
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

  const handleLogout = () => {
    authService.logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  // Calculate portfolio stats
  const portfolioStats = {
    totalValue: Array.isArray(portfolio) ? portfolio.reduce((acc, asset) => acc + asset.valueUSD, 0) : 0,
    totalProfit: Array.isArray(portfolio) ? portfolio.reduce((acc, asset) => acc + asset.profitLoss, 0) : 0,
  };

  // Convert portfolio to pie chart data
  const pieChartData = Array.isArray(portfolio) 
    ? portfolio.map((asset) => ({
        name: asset.coinId,
        value: asset.valueUSD,
      })) 
    : [];

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9370DB', '#FF6B6B'];

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

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 md:px-6 pt-28 pb-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h2 className="text-2xl font-semibold mb-4">Error Loading Profile</h2>
          <p className="text-muted-foreground mb-8">We couldn't load your profile information. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 md:px-6 pt-28 pb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Manage your assets and track your investments</p>
            </div>
            <Button variant="destructive" className="rounded-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <GlassCard className="p-6" variant="light">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Available Balance</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(user?.balance?.available || 0)}</h3>
                </div>
              </div>
            </GlassCard>
            
            <GlassCard className="p-6" variant="light">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Portfolio Value</p>
                  <h3 className="text-2xl font-bold">{formatCurrency(portfolioStats.totalValue)}</h3>
                </div>
              </div>
            </GlassCard>
            
            <GlassCard className="p-6" variant="light">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  portfolioStats.totalProfit >= 0
                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                }`}>
                  {portfolioStats.totalProfit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total P&L</p>
                  <h3 className={`text-2xl font-bold ${
                    portfolioStats.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatCurrency(portfolioStats.totalProfit)}
                  </h3>
                </div>
              </div>
            </GlassCard>
          </div>

          <Tabs 
            value={selectedTab} 
            onValueChange={setSelectedTab}
            className="mb-10"
          >
            <TabsList className="mb-8">
              <TabsTrigger value="portfolio" className="px-4 py-2">Portfolio</TabsTrigger>
              <TabsTrigger value="transactions" className="px-4 py-2">Transactions</TabsTrigger>
              <TabsTrigger value="watchlist" className="px-4 py-2">Watchlist</TabsTrigger>
            </TabsList>
            
            <TabsContent value="portfolio">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <GlassCard className="p-6" variant="light">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-medium">My Assets</h3>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <ArrowRight size={16} className="mr-2" />
                        Trade
                      </Button>
                    </div>
                    
                    {!Array.isArray(portfolio) || portfolio.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">You don't have any assets yet</p>
                        <Button asChild>
                          <Link to="/trading">Start Trading</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left text-muted-foreground font-medium p-3">Asset</th>
                              <th className="text-right text-muted-foreground font-medium p-3">Amount</th>
                              <th className="text-right text-muted-foreground font-medium p-3">Value</th>
                              <th className="text-right text-muted-foreground font-medium p-3">P&L</th>
                              <th className="text-right text-muted-foreground font-medium p-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {portfolio.map((asset) => (
                              <tr key={asset.coinId} className="border-b border-border">
                                <td className="p-3">
                                  <Link to={`/coin/${asset.coinId}`} className="flex items-center gap-3 hover:text-primary">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                      <img src={`https://assets.coingecko.com/coins/images/1/small/bitcoin.png`} alt={asset.coinId} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-medium">{asset.coinId}</span>
                                  </Link>
                                </td>
                                <td className="text-right p-3">{asset.amount}</td>
                                <td className="text-right p-3">{formatCurrency(asset.valueUSD)}</td>
                                <td className={`text-right p-3 ${asset.profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {formatCurrency(asset.profitLoss)} ({asset.profitLossPercentage.toFixed(2)}%)
                                </td>
                                <td className="text-right p-3">
                                  <Button size="sm" asChild>
                                    <Link to={`/trading/${asset.coinId}`}>Trade</Link>
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
                  <GlassCard className="p-6" variant="light">
                    <h3 className="text-xl font-medium mb-6">Portfolio Allocation</h3>
                    
                    {!Array.isArray(portfolio) || portfolio.length === 0 ? (
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">No assets to display</p>
                      </div>
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
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Legend</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {pieChartData.map((entry, index) => (
                          <div key={`legend-${index}`} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span>{entry.name.substring(0, 3).toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="transactions">
              <GlassCard className="p-6" variant="light">
                <h3 className="text-xl font-medium mb-6">Recent Transactions</h3>
                
                {!Array.isArray(user?.orders) || user.orders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">You haven't made any transactions yet</p>
                    <Button asChild>
                      <Link to="/trading">Start Trading</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-muted-foreground font-medium p-3">Date</th>
                          <th className="text-left text-muted-foreground font-medium p-3">Type</th>
                          <th className="text-left text-muted-foreground font-medium p-3">Asset</th>
                          <th className="text-right text-muted-foreground font-medium p-3">Amount</th>
                          <th className="text-right text-muted-foreground font-medium p-3">Price</th>
                          <th className="text-right text-muted-foreground font-medium p-3">Total</th>
                          <th className="text-right text-muted-foreground font-medium p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(user.orders) && user.orders.map((order) => (
                          <tr key={order.id} className="border-b border-border">
                            <td className="p-3">
                              {new Date(order.timestamp).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.type === "buy" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              }`}>
                                {order.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">{order.coinId}</td>
                            <td className="text-right p-3">{order.amount}</td>
                            <td className="text-right p-3">{formatCurrency(order.price)}</td>
                            <td className="text-right p-3">{formatCurrency(order.total)}</td>
                            <td className="text-right p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === "filled" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : order.status === "cancelled"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                              }`}>
                                {order.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </TabsContent>
            
            <TabsContent value="watchlist">
              <GlassCard className="p-6" variant="light">
                <h3 className="text-xl font-medium mb-6">My Watchlist</h3>
                
                {!Array.isArray(user?.watchlist) || user.watchlist.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
                    <Button asChild>
                      <Link to="/market">Browse Market</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user.watchlist.map((coinId) => (
                      <Link
                        key={coinId}
                        to={`/coin/${coinId}`}
                        className="p-4 border border-border rounded-lg hover:bg-secondary/20 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              <img src={`https://assets.coingecko.com/coins/images/1/small/bitcoin.png`} alt={coinId} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-medium">{coinId}</span>
                          </div>
                          <ExternalLink size={16} className="text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
