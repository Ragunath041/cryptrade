
import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "dark" | "light" | "outline";
}

export const GlassCard = ({
  children,
  className,
  variant = "default",
  ...props
}: GlassCardProps) => {
  const variantClasses = {
    default: "bg-white/20 backdrop-blur-lg border border-white/20 shadow-sm",
    dark: "bg-black/30 backdrop-blur-lg border border-white/10 shadow-md",
    light: "bg-white/60 backdrop-blur-md border border-white/40 shadow-sm",
    outline: "bg-transparent backdrop-blur-sm border border-white/20",
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-300 ease-in-out",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
