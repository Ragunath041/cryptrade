
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Coin } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";

interface CoinCardProps {
  coin: Coin;
  className?: string;
}

const CoinCard: React.FC<CoinCardProps> = ({ coin, className }) => {
  const { id, name, symbol, price, change24h, image } = coin;
  
  const formatPrice = (price: number) => {
    return price < 1 
      ? price.toFixed(4) 
      : price.toLocaleString('en-US', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
  };

  return (
    <Link to={`/coin/${id}`} className={className}>
      <GlassCard
        className="p-5 h-full hover:shadow-md hover:translate-y-[-4px] transition-all duration-300 overflow-hidden group"
        variant="light"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{symbol}</p>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <ArrowUpRight size={16} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold">${formatPrice(price)}</p>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              change24h >= 0
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {change24h >= 0 ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {Math.abs(change24h).toFixed(2)}%
          </div>
        </div>

        {coin.sparkline && (
          <div className="h-10 mt-3 relative overflow-hidden">
            <svg viewBox="0 0 100 20" className="w-full h-full">
              <path
                d={`M0,${20 - (coin.sparkline[0] / Math.max(...coin.sparkline) * 20)} ${coin.sparkline.map((value, index) => 
                  `L${index * (100 / (coin.sparkline.length - 1))},${20 - (value / Math.max(...coin.sparkline) * 20)}`
                ).join(" ")}`}
                fill="none"
                stroke={change24h >= 0 ? "rgba(22, 163, 74, 0.7)" : "rgba(220, 38, 38, 0.7)"}
                strokeWidth="1.5"
                className="transition-all duration-500"
              />
              <circle
                cx={100}
                cy={20 - (coin.sparkline[coin.sparkline.length - 1] / Math.max(...coin.sparkline) * 20)}
                r="2"
                fill={change24h >= 0 ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)"}
                className="transition-all duration-500"
              />
            </svg>
          </div>
        )}
      </GlassCard>
    </Link>
  );
};

export default CoinCard;
