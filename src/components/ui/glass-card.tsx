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
    default: "bg-background/80 backdrop-blur-lg border border-border shadow-sm dark:bg-background/60 dark:border-border/50",
    dark: "bg-background/90 backdrop-blur-lg border border-border/50 shadow-md dark:bg-background/80",
    light: "bg-background/60 backdrop-blur-md border border-border/30 shadow-sm dark:bg-background/40",
    outline: "bg-transparent backdrop-blur-sm border border-border/20",
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
