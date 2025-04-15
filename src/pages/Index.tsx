import React, { useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import MarketOverview from "@/components/home/MarketOverview";
import FeaturesSection from "@/components/home/FeaturesSection";

const Index: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Trade Cryptocurrencies
        </h1>
        <h2 className="text-3xl md:text-5xl font-bold mb-12">
          with Confidence and Ease
        </h2>
        
        {/* Get Started Button */}
        <button
          onClick={() => navigate('/auth')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Get Started
        </button>
      </div>
      {/* <Footer /> */}
    </div>
  );
};

export default Index;
