# CrypTrade - Advanced Crypto Trading Platform

CrypTrade is a full-stack cryptocurrency trading platform that enables users to trade digital assets, manage portfolios, and execute binary options trades with real-time market data.

## 🚀 Features

- Real-time cryptocurrency price tracking
- Advanced trading interface with TradingView charts
- Binary options trading
- Secure user authentication and authorization
- Portfolio management
- Real-time trade execution
- Historical trade analysis

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- Vite for build tooling
- TailwindCSS for styling
- shadcn/ui for UI components
- TradingView charts integration

### Backend
- Django REST Framework
- PostgreSQL database
- JWT authentication
- Coinbase API integration
- WebSocket for real-time updates

## 🔧 Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- Python 3.9+
- PostgreSQL

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/Ragunath041/cryptrade.git
cd cryptrade

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd Backend/cryptobackend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

## 🔐 Environment Variables

Create a `.env` file in the backend directory with the following variables:
```env
SECRET_KEY=your_django_secret_key
DEBUG=True
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_API_SECRET=your_coinbase_api_secret
DATABASE_URL=your_database_url
```

## 📚 API Documentation

The API documentation is available at `/api/docs/` when running the backend server.

Key endpoints:
- `/api/auth/` - Authentication endpoints
- `/api/portfolio/` - Portfolio management
- `/api/trades/` - Trade execution and history
- `/api/market/` - Market data and pricing

## 🔒 Security

- JWT-based authentication
- Secure API key storage
- Rate limiting
- Input validation and sanitization

## 📈 Future Improvements

- Add more trading pairs
- Implement advanced trading strategies
- Add social trading features
- Mobile app development
- Enhanced analytics dashboard

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
