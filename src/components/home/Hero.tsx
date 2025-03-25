
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const Hero: React.FC = () => {
  return (
    <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-[45%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[45%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight md:leading-tight lg:leading-tight text-balance animate-fade-in">
            Trade Cryptocurrencies with Confidence and Ease
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in opacity-0" style={{ animationDelay: "0.2s" }}>
            A premium trading platform with advanced tools, multiple cryptocurrencies, and a seamless user experience designed for both beginners and professionals.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in opacity-0" style={{ animationDelay: "0.4s" }}>
            <Button 
              asChild
              size="lg" 
              className="rounded-full px-8 py-6 font-medium text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <Link to="/market">
                Explore Markets
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
            <Button 
              asChild
              variant="outline" 
              size="lg" 
              className="rounded-full px-8 py-6 font-medium text-base border-primary/20 hover:border-primary/80 hover:bg-primary/5 transition-all duration-300"
            >
              <Link to="/trading">
                Start Trading
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {[
            {
              icon: <TrendingUp className="h-6 w-6" />,
              title: "Live Market Data",
              description: "Get real-time cryptocurrency prices, charts, and market movements at your fingertips."
            },
            {
              icon: <Shield className="h-6 w-6" />,
              title: "Secure Transactions",
              description: "Advanced security protocols to ensure your digital assets remain protected at all times."
            },
            {
              icon: <RefreshCw className="h-6 w-6" />,
              title: "Instant Trading",
              description: "Execute trades quickly with our optimized trading engine designed for speed and reliability."
            },
          ].map((item, index) => (
            <GlassCard
              key={index}
              className="p-6 animate-fade-in opacity-0"
              variant="light"
              style={{ animationDelay: `${0.6 + index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                {item.icon}
              </div>
              <h3 className="font-medium text-lg mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
