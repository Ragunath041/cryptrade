import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { authService } from "@/lib/http";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const isAuth = authService.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        const user = authService.getCurrentUser();
        setUsername(user.username || "User");
      }
    };
    
    checkAuth();
    
    // Listen for authentication state changes
    window.addEventListener("auth-change", checkAuth);
    
    return () => {
      window.removeEventListener("auth-change", checkAuth);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    // Close menu when route changes
    setIsMenuOpen(false);
  }, [location]);

  const handleNavigation = (path: string) => {
    if (path === "/market") {
      if (location.pathname !== "/") {
        navigate("/");
        // Wait for navigation to complete before scrolling
        setTimeout(() => {
          const marketSection = document.getElementById("market");
          if (marketSection) {
            marketSection.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        const marketSection = document.getElementById("market");
        if (marketSection) {
          marketSection.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else if (path === "/") {
      if (location.pathname === "/") {
        // If already on home page, scroll to top smoothly
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // If on another page, navigate to home and scroll to top
        navigate("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      navigate(path);
    }
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
  };

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Market", path: "/market" },
    { label: "Trading", path: "/trading" },
    { label: "Dashboard", path: "/dashboard" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "py-3 bg-background/80 backdrop-blur-lg shadow-sm"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xl md:text-2xl font-bold"
        >
          <span className="text-primary animate-pulse-soft">Cryp</span>
          <span className="text-muted-foreground text-sm font-normal">Trade</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`text-sm font-medium transition-all duration-200 hover:text-primary ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="rounded-full px-4 py-2 transition-all duration-300 border-primary/20 hover:border-primary/80 backdrop-blur-sm"
                >
                  <User className="h-4 w-4 mr-2" />
                  {username}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline"
              className="rounded-full px-6 transition-all duration-300 border-primary/20 hover:border-primary/80 backdrop-blur-sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="p-2 md:hidden text-foreground rounded-md"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[60px] bg-background z-40 animate-fade-in md:hidden">
          <div className="container mx-auto px-4 py-6 flex flex-col gap-6">
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`text-lg font-medium py-2 text-left transition-all duration-200 hover:text-primary ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex justify-center mb-2">
                <ThemeToggle />
              </div>
              
              {isAuthenticated ? (
                <>
                  <Button 
                    variant="outline"
                    className="w-full rounded-full py-6 transition-all duration-300 border-primary/20 hover:border-primary/80"
                    onClick={() => navigate("/dashboard")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full rounded-full py-6 transition-all duration-300 border-red-500/20 hover:border-red-500 text-red-500"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline"
                  className="w-full rounded-full py-6 transition-all duration-300 border-primary/20 hover:border-primary/80"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
