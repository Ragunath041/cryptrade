
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LineChart, Wallet, Zap, Unlock, Lock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <LineChart className="h-6 w-6" />,
      title: "Advanced Charts",
      description: "Analyze markets with professional-grade charting tools and technical indicators."
    },
    {
      icon: <Wallet className="h-6 w-6" />,
      title: "Portfolio Tracking",
      description: "Monitor your crypto assets in real-time with comprehensive performance metrics."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Trading",
      description: "Execute trades quickly and reliably with our optimized trading engine."
    },
    {
      icon: <Unlock className="h-6 w-6" />,
      title: "Multi-Currency Support",
      description: "Trade a wide variety of cryptocurrencies from a single platform."
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Enhanced Security",
      description: "Rest easy with our industry-leading security protocols protecting your assets."
    },
    {
      icon: <Activity className="h-6 w-6" />,
      title: "Real-time Alerts",
      description: "Stay informed with customizable price alerts and market notifications."
    }
  ];

  return (
    <section className="py-20 md:py-32 relative">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Powerful Features for Every Trader</h2>
          <p className="text-muted-foreground text-lg">
            Our platform combines cutting-edge technology with an intuitive interface to provide you with the tools you need to succeed in the cryptocurrency market.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <GlassCard
              key={index}
              className="p-8 hover:shadow-md transition-all duration-300 hover:transform hover:translate-y-[-5px] group"
              variant="light"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </GlassCard>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Button
            asChild
            className="rounded-full px-8 py-6 font-medium text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm"
          >
            <Link to="/trading">
              Start Trading Now
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
