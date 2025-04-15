import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate,
  UNSAFE_DataRouterContext, 
  UNSAFE_DataRouterStateContext 
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import TradingLayout from "./layouts/TradingLayout";
import CryptoTradingView from "./components/CryptoTradingView";
import TradingHistory from "./pages/TradingHistory";
import axios from "axios";

// Configure axios defaults for Django backend
axios.defaults.baseURL = 'http://localhost:8000'; // Change to match your Django backend URL
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add interceptor to handle authentication
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

const queryClient = new QueryClient();

const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={routerFutureConfig}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/trading" element={<TradingLayout />}>
            <Route index element={<CryptoTradingView initialBalance={10000} />} />
            <Route path="history" element={<TradingHistory />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
