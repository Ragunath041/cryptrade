import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16 mt-16">
        <h1 className="text-4xl font-bold mb-8">About Us</h1>
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p>
            Welcome to CrypTrade, your premier destination for cryptocurrency trading. 
            We provide a secure and user-friendly platform for trading various cryptocurrencies 
            with real-time market data and advanced trading features.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p>
            Our mission is to make cryptocurrency trading accessible to everyone. 
            We believe in providing a transparent, secure, and efficient trading 
            environment that caters to both beginners and experienced traders.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Features</h2>
          <ul>
            <li>Real-time cryptocurrency price updates</li>
            <li>Advanced trading charts and analysis tools</li>
            <li>Secure trading environment</li>
            <li>User-friendly interface</li>
            <li>24/7 market access</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About; 