import axios from 'axios';
// Remove Coinbase SDK import which causes Buffer issues
// import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

interface ApiError {
  message: string;
  response?: {
    data?: {
      detail?: string;
    };
  };
}

// Create an axios instance for our API
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api', // Change to your Django backend URL
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add interceptors to handle authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and not already retrying
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // Redirect to login if refresh token is missing
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        const response = await axios.post('/api/token/refresh/', {
          refresh: refreshToken
        });
        
        const { access } = response.data;
        
        // Save the new access token
        localStorage.setItem('access_token', access);
        
        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Authentication endpoints
export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/token/', { email, password });
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Login error:', apiError);
      throw apiError;
    }
  },
  
  register: async (userData: { username: string, email: string, password: string }) => {
    try {
      const response = await apiClient.post('/users/register/', userData);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Registration error:', apiError);
      throw apiError;
    }
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

// Portfolio management endpoints
export const portfolioApi = {
  getPortfolio: async () => {
    const response = await apiClient.get('/portfolio/');
    return response.data;
  },
  
  getTotalValue: async () => {
    const response = await apiClient.get('/portfolio/total_value/');
    return response.data;
  },
  
  syncFromExchange: async (apiKeyId: string) => {
    const response = await apiClient.post('/portfolio/sync_from_exchange/', { api_key_id: apiKeyId });
    return response.data;
  }
};

// Trading endpoints
export const tradeApi = {
  executeTrade: async (tradeData: {
    symbol: string,
    quantity: number,
    trade_type: 'BUY' | 'SELL',
    api_key_id?: string
  }) => {
    try {
      // Use a simulated trade implementation instead of Coinbase SDK
      if (tradeData.api_key_id) {
        // Get API key details from our backend
        const keys = await apiClient.get(`/api-keys/${tradeData.api_key_id}/`);
        
        // If we have the keys, simulate a trade
        if (keys.data && keys.data.api_key) {
          // Simulate trade completion with a delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Return a simulated trade result
          return {
            status: 'COMPLETED',
            tradeId: `${tradeData.trade_type}-${tradeData.symbol}-${Date.now()}`,
            amount: tradeData.quantity,
            symbol: tradeData.symbol,
            type: tradeData.trade_type
          };
        }
      }
      
      throw new Error('API key is required for trading');
    } catch (error) {
      console.error('Error executing trade:', error);
      throw error;
    }
  },
  
  getTradeHistory: async () => {
    const response = await apiClient.get('/trades/');
    return response.data;
  },
  
  getCurrentPrices: async (symbols: string[]) => {
    const symbolsParam = symbols.join(',');
    const response = await apiClient.get(`/trades/current_prices/?symbols=${symbolsParam}`);
    return response.data;
  }
};

// API Key management endpoints
export const apiKeyApi = {
  getApiKeys: async () => {
    const response = await apiClient.get('/api-keys/');
    return response.data;
  },
  
  addApiKey: async (apiKeyData: {
    exchange: string,
    api_key: string,
    api_secret: string,
    passphrase?: string,
    description?: string
  }) => {
    // For Coinbase API keys, validate and get wallet info before saving
    if (apiKeyData.exchange === 'COINBASE' && apiKeyData.api_key) {
      try {
        // Configure Coinbase SDK with the API key
        Coinbase.configureFromJson({ filePath: apiKeyData.api_key });

        // Try to create a wallet to validate the API key
        const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseMainnet });
        if (!wallet) {
          throw new Error('Invalid Coinbase API key');
        }
      } catch (error) {
        throw new Error('Invalid Coinbase API key: Unable to access account');
      }
    }
    
    const response = await apiClient.post('/api-keys/', apiKeyData);
    return response.data;
  },
  
  testConnection: async (apiKeyId: string) => {
    try {
      const keys = await apiClient.get(`/api-keys/${apiKeyId}/`);
      if (keys.data && keys.data.api_key) {
        // Configure Coinbase SDK with the API key
        Coinbase.configureFromJson({ filePath: keys.data.api_key });

        // Try to create a wallet to validate the connection
        const wallet = await Wallet.create({ networkId: Coinbase.networks.BaseMainnet });
        return { valid: true, wallet: wallet.export() };
      }
      return { valid: false, error: 'API key not found' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },
  
  deleteApiKey: async (apiKeyId: string) => {
    const response = await apiClient.delete(`/api-keys/${apiKeyId}/`);
    return response.data;
  }
};

// Binary Options trading endpoints
export const binaryOptionsApi = {
  executeTrade: async (tradeData: {
    symbol: string,
    amount: number,
    direction: 'UP' | 'DOWN',
    expiry_minutes: number
  }) => {
    const response = await apiClient.post('/binary-options/', tradeData);
    return response.data;
  },
  
  getActiveTrades: async () => {
    const response = await apiClient.get('/binary-options/active/');
    return response.data;
  },
  
  getTradeHistory: async () => {
    const response = await apiClient.get('/binary-options/history/');
    return response.data;
  },
  
  closeEarly: async (tradeId: string) => {
    const response = await apiClient.post(`/binary-options/${tradeId}/close_early/`);
    return response.data;
  }
};

export default apiClient;