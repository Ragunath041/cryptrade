
import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartData, TimeRange } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PriceChartProps {
  data: ChartData[];
  coinId: string;
  coinName: string;
  color?: string;
  className?: string;
}

const timeRanges: TimeRange[] = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "7d" },
  { label: "1M", value: "30d" },
  { label: "3M", value: "90d" },
  { label: "1Y", value: "365d" },
  { label: "All", value: "max" },
];

const PriceChart: React.FC<PriceChartProps> = ({
  data,
  coinId,
  coinName,
  color = "#3b82f6",
  className,
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("7d");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Format date for tooltip
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format price for tooltip
  const formatPrice = (price: number): string => {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <GlassCard className="p-4 !bg-background/80 shadow-lg border-border" variant="light">
          <p className="text-sm font-medium text-foreground">{formatDate(label)}</p>
          <p className="text-lg font-bold mt-1" style={{ color }}>
            {formatPrice(payload[0].value)}
          </p>
        </GlassCard>
      );
    }
    return null;
  };

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setIsLoading(true);
    setSelectedTimeRange(value);
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-foreground">{coinName} Price Chart</h3>
        <Tabs defaultValue="7d" value={selectedTimeRange} onValueChange={handleTimeRangeChange}>
          <TabsList className="bg-muted/50">
            {timeRanges.map((range) => (
              <TabsTrigger
                key={range.value}
                value={range.value}
                className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {range.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="w-full h-80 flex items-center justify-center">
          <div className="bg-gradient-to-r from-muted/10 to-muted/30 animate-shimmer w-full h-full rounded-lg"></div>
        </div>
      ) : (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${coinId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                minTickGap={60}
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                width={80}
              />
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={1000}
                fillOpacity={1}
                fill={`url(#gradient-${coinId})`}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default PriceChart;
