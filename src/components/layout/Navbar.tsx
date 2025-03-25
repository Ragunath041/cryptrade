import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
          <Button 
            variant="outline"
            className="rounded-full px-6 transition-all duration-300 border-primary/20 hover:border-primary/80 backdrop-blur-sm"
            onClick={() => navigate("/auth")}
          >
            Sign In
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
              <Button 
                variant="outline"
                className="w-full rounded-full py-6 transition-all duration-300 border-primary/20 hover:border-primary/80"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
