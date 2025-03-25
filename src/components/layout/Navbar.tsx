
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

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
          <span className="text-primary animate-pulse-soft">CoinSwap</span>
          <span className="text-muted-foreground text-sm font-normal">hub</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-all duration-200 hover:text-primary ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button 
            variant="outline"
            className="rounded-full px-6 transition-all duration-300 border-primary/20 hover:border-primary/80 backdrop-blur-sm"
          >
            Sign In
          </Button>
          <Button 
            className="rounded-full px-6 bg-primary/90 hover:bg-primary transition-all duration-300 text-primary-foreground shadow-sm"
          >
            Get Started
          </Button>
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
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-lg font-medium py-2 transition-all duration-200 hover:text-primary ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-3 mt-4">
              <Button 
                variant="outline"
                className="w-full rounded-full py-6 transition-all duration-300 border-primary/20 hover:border-primary/80"
              >
                Sign In
              </Button>
              <Button 
                className="w-full rounded-full py-6 bg-primary/90 hover:bg-primary transition-all duration-300 text-primary-foreground"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
