import { Link } from "react-router-dom";
import { ModeToggle } from "../mode-toggle";

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center">
          {/* Logo - Left */}
          <div className="w-1/3">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold">CrypTrade</span>
            </Link>
          </div>

          {/* Navigation Links - Center */}
          <div className="flex-1 flex justify-center items-center space-x-8">
            <Link 
              to="/trading" 
              className="text-foreground/60 hover:text-foreground transition-colors text-lg font-medium"
            >
              Trading
            </Link>
            <Link 
              to="/about" 
              className="text-foreground/60 hover:text-foreground transition-colors text-lg font-medium"
            >
              About
            </Link>
          </div>

          {/* Theme Toggle - Right */}
          <div className="w-1/3 flex justify-end">
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
