import { useState, useEffect } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { authApi } from "@/api/api";
import { LogOut, Menu, User, Bitcoin, History, LineChart } from "lucide-react";

// Coin interface from Coinbase
interface Coin {
  id: string;
  name: string;
  symbol: string;
  image?: string;
}

const TradingLayout = () => {
  const [username, setUsername] = useState<string>("User");
  const [balance, setBalance] = useState<number>(10000);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string>('BTC-USD');
  const navigate = useNavigate();

  // Fetch available coins from Coinbase
  useEffect(() => {
    const fetchCoins = async () => {
      setLoading(true);
      try {
        // Default popular coins if API is not available
        const popularCoins: Coin[] = [
          { id: 'BTC-USD', name: 'Bitcoin', symbol: 'BTC' },
          { id: 'ETH-USD', name: 'Ethereum', symbol: 'ETH' },
          { id: 'SOL-USD', name: 'Solana', symbol: 'SOL' },
          { id: 'DOGE-USD', name: 'Dogecoin', symbol: 'DOGE' },
          { id: 'ADA-USD', name: 'Cardano', symbol: 'ADA' },
          { id: 'XRP-USD', name: 'Ripple', symbol: 'XRP' },
          { id: 'DOT-USD', name: 'Polkadot', symbol: 'DOT' },
          { id: 'SHIB-USD', name: 'Shiba Inu', symbol: 'SHIB' },
        ];
        
        setCoins(popularCoins);
      } catch (error) {
        console.error("Error fetching coins:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
  }, []);

  useEffect(() => {
    // Check for authentication
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Get user info
    const userJson = localStorage.getItem("user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        setUsername(user.username || "User");
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    authApi.logout();
    navigate("/login");
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Mobile Sidebar Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-40"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Left Sidebar */}
      <div className="w-16 bg-black border-r border-gray-800 flex flex-col items-center py-4">
        <div className="mb-8">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <span className="text-black font-bold text-sm">CT</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center space-y-6">
          {/* Trading Chart */}
          <Link to="/trading" className="p-2 rounded-lg bg-gray-800 text-green-400 hover:bg-gray-700 hover:text-white transition-colors">
            <LineChart size={20} />
          </Link>
          
          {/* Trading History */}
          <Link to="/trading/history" className="p-2 rounded-lg text-green-400 hover:text-white hover:bg-gray-800 transition-colors">
            <History size={20} />
          </Link>
        </div>
        
        <div className="mt-auto text-xs text-gray-500">
          v1.0
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm md:hidden" onClick={closeMobileSidebar}>
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex justify-between items-center border-b border-gray-800">
              <h2 className="text-xl font-bold">Cryptrade</h2>
              <Button variant="ghost" size="icon" onClick={closeMobileSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <div className="flex flex-col space-y-4">
                {/* Trading Chart */}
                <Link 
                  to="/trading" 
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-800"
                  onClick={closeMobileSidebar}
                >
                  <LineChart size={20} className="text-green-400" />
                  <span>Trading Chart</span>
                </Link>
                
                {/* Cryptocurrency Selection - Moved to dropdown in the header */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800">
                    <Bitcoin size={20} className="text-green-400" />
                    <span>Cryptocurrencies</span>
                  </div>
                  <div className="pl-8 space-y-1">
                    {coins.map((coin) => (
                      <div 
                        key={coin.id}
                        className="flex items-center space-x-2 p-1 rounded hover:bg-gray-700 cursor-pointer"
                        onClick={() => {
                          setSelectedCoin(coin.id);
                          closeMobileSidebar();
                        }}
                      >
                        <Bitcoin size={14} className="text-green-400" />
                        <span className="text-sm">{coin.symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Trading History */}
                <Link 
                  to="/trading/history" 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800"
                  onClick={closeMobileSidebar}
                >
                  <History size={20} />
                  <span>Trading History</span>
                </Link>
              </div>
            </div>
            <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
              <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-semibold">
                  <Bitcoin className="mr-2 h-5 w-5 text-green-400" />
                  <span className="mr-2 text-lg font-bold">{selectedCoin.split('-')[0]}</span>
                  <span className="text-gray-400">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-800 text-white">
                <div className="px-2 py-2 text-xs text-gray-400">Select Cryptocurrency</div>
                <DropdownMenuSeparator className="bg-gray-800" />
                {coins.map((coin) => (
                  <DropdownMenuItem 
                    key={coin.id}
                    className="hover:bg-gray-800 cursor-pointer flex items-center gap-2"
                    onClick={() => setSelectedCoin(coin.id)}
                  >
                    <Bitcoin size={16} className="text-green-400" />
                    <span>{coin.name}</span>
                    <span className="text-gray-400 ml-auto">{coin.symbol}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center space-x-4">
           
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-800">
                <DropdownMenuItem className="cursor-pointer hover:bg-gray-800" onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500 cursor-pointer hover:bg-gray-800" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Main Trading Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ selectedCoin }} />
        </div>
      </div>
    </div>
  );
};

export default TradingLayout; 