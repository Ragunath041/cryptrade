
import React, { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import MarketOverview from "@/components/home/MarketOverview";
import FeaturesSection from "@/components/home/FeaturesSection";

const Index: React.FC = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <MarketOverview />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
