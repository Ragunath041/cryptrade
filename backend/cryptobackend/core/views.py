from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .models import Portfolio, Trade, ApiKey, BinaryOptionTrade
from .serializers import UserSerializer, PortfolioSerializer, TradeSerializer, ApiKeySerializer, BinaryOptionTradeSerializer
import requests
from decimal import Decimal
import ccxt
import json
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import os

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': serializer.data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ApiKeyViewSet(viewsets.ModelViewSet):
    serializer_class = ApiKeySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ApiKey.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        api_key = self.get_object()
        try:
            # Initialize the exchange
            if api_key.exchange == 'BINANCE':
                exchange = ccxt.binance({
                    'apiKey': api_key.api_key,
                    'secret': api_key.api_secret,
                })
            elif api_key.exchange == 'COINBASE':
                exchange = ccxt.coinbase({
                    'apiKey': api_key.api_key,
                    'secret': api_key.api_secret,
                })
            elif api_key.exchange == 'KRAKEN':
                exchange = ccxt.kraken({
                    'apiKey': api_key.api_key,
                    'secret': api_key.api_secret,
                })
            elif api_key.exchange == 'KUCOIN':
                exchange = ccxt.kucoin({
                    'apiKey': api_key.api_key,
                    'secret': api_key.api_secret,
                })
            elif api_key.exchange == 'BITFINEX':
                exchange = ccxt.bitfinex({
                    'apiKey': api_key.api_key,
                    'secret': api_key.api_secret,
                })
            else:
                return Response({'error': 'Unsupported exchange'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Test connection by fetching balance
            balance = exchange.fetch_balance()
            return Response({'status': 'success', 'message': 'Connection successful!'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PortfolioViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def total_value(self, request):
        portfolios = self.get_queryset()
        total_value = Decimal('0')
        
        # Try to use user's API keys first
        api_keys = ApiKey.objects.filter(user=request.user, is_active=True)
        if api_keys.exists():
            try:
                # Choose the first active API key
                api_key = api_keys.first()
                
                # Initialize the exchange based on the API key
                if api_key.exchange == 'BINANCE':
                    exchange = ccxt.binance({
                        'apiKey': api_key.api_key,
                        'secret': api_key.api_secret,
                    })
                elif api_key.exchange == 'COINBASE':
                    exchange = ccxt.coinbase({
                        'apiKey': api_key.api_key,
                        'secret': api_key.api_secret,
                    })
                # Add more exchanges as needed
                
                # Fetch balances directly from the exchange
                balances = exchange.fetch_balance()
                
                # Calculate the total value
                for currency, amount in balances['total'].items():
                    if amount > 0 and currency != 'USDT':
                        try:
                            ticker = exchange.fetch_ticker(f'{currency}/USDT')
                            price = Decimal(str(ticker['last']))
                            total_value += Decimal(str(amount)) * price
                        except:
                            continue
                
                return Response({'total_value': str(total_value), 'source': 'exchange_api'})
                
            except Exception as e:
                # Fallback to regular method
                pass
        
        # Fallback: Use Binance public API
        for portfolio in portfolios:
            try:
                response = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={portfolio.symbol}USDT')
                current_price = Decimal(response.json()['price'])
                total_value += portfolio.quantity * current_price
            except:
                continue
        
        return Response({'total_value': str(total_value), 'source': 'public_api'})

    @action(detail=False, methods=['post'])
    def sync_from_exchange(self, request):
        api_key_id = request.data.get('api_key_id')
        
        try:
            api_key = ApiKey.objects.get(id=api_key_id, user=request.user, is_active=True)
            
            # Initialize the exchange
            if api_key.exchange == 'BINANCE':
                exchange = ccxt.binance({
                    'apiKey': api_key.api_key,
                    'secret': api_key.api_secret,
                })
            # Add more exchanges as needed
            
            # Fetch balances
            balances = exchange.fetch_balance()
            
            # Update or create portfolio entries
            synced_items = []
            for currency, amount in balances['total'].items():
                if amount > 0 and currency != 'USDT':
                    # Get current price
                    try:
                        ticker = exchange.fetch_ticker(f'{currency}/USDT')
                        price = Decimal(str(ticker['last']))
                        
                        # Update or create portfolio entry
                        portfolio, created = Portfolio.objects.update_or_create(
                            user=request.user,
                            symbol=currency,
                            defaults={
                                'quantity': Decimal(str(amount)),
                                'average_buy_price': price  # This is an approximation
                            }
                        )
                        
                        synced_items.append({
                            'symbol': currency,
                            'quantity': str(amount),
                            'price': str(price)
                        })
                    except:
                        continue
            
            return Response({
                'status': 'success', 
                'message': 'Portfolio synchronized successfully', 
                'items': synced_items
            }, status=status.HTTP_200_OK)
            
        except ApiKey.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'API key not found or inactive'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TradeViewSet(viewsets.ModelViewSet):
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trade.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        symbol = request.data.get('symbol')
        quantity = Decimal(request.data.get('quantity'))
        trade_type = request.data.get('trade_type')
        exchange_name = request.data.get('exchange')
        api_key_id = request.data.get('api_key_id')
        
        # Check if using an exchange API or public API
        if api_key_id:
            try:
                api_key = ApiKey.objects.get(id=api_key_id, user=request.user, is_active=True)
                
                # Initialize the exchange
                if api_key.exchange == 'BINANCE':
                    exchange = ccxt.binance({
                        'apiKey': api_key.api_key,
                        'secret': api_key.api_secret,
                    })
                # Add more exchanges as needed
                
                # Execute the trade
                symbol_pair = f"{symbol}/USDT"
                
                if trade_type == 'BUY':
                    order = exchange.create_market_buy_order(symbol_pair, float(quantity))
                else:  # SELL
                    order = exchange.create_market_sell_order(symbol_pair, float(quantity))
                
                # Calculate average price and total amount
                price = Decimal(str(order['price'])) if 'price' in order else Decimal(str(order['average']))
                total_amount = price * quantity
                
                # Create trade record
                trade_data = {
                    'symbol': symbol,
                    'trade_type': trade_type,
                    'quantity': quantity,
                    'price': price,
                    'total_amount': total_amount,
                    'exchange': api_key.exchange,
                }
                
                serializer = self.get_serializer(data=trade_data)
                if serializer.is_valid():
                    serializer.save(user=request.user)
                    
                    # Update portfolio
                    self._update_portfolio(request.user, symbol, trade_type, quantity, price)
                    
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            except ApiKey.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'API key not found or inactive'
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Fallback to mock trading using public API
        try:
            response = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={symbol}USDT')
            current_price = Decimal(response.json()['price'])
        except:
            return Response({'error': 'Failed to fetch current price'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate total amount
        total_amount = quantity * current_price

        # Create trade record
        trade_data = {
            'symbol': symbol,
            'trade_type': trade_type,
            'quantity': quantity,
            'price': current_price,
            'total_amount': total_amount,
            'exchange': 'PUBLIC_API',
        }
        
        serializer = self.get_serializer(data=trade_data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            
            # Update portfolio
            self._update_portfolio(request.user, symbol, trade_type, quantity, current_price)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _update_portfolio(self, user, symbol, trade_type, quantity, price):
        try:
            portfolio, created = Portfolio.objects.get_or_create(
                user=user,
                symbol=symbol,
                defaults={
                    'quantity': 0,
                    'average_buy_price': 0
                }
            )
            
            if trade_type == 'BUY':
                # Calculate new average buy price
                total_value = (portfolio.quantity * portfolio.average_buy_price) + (quantity * price)
                new_quantity = portfolio.quantity + quantity
                if new_quantity > 0:
                    new_avg_price = total_value / new_quantity
                else:
                    new_avg_price = 0
                
                portfolio.quantity = new_quantity
                portfolio.average_buy_price = new_avg_price
            else:  # SELL
                portfolio.quantity = max(0, portfolio.quantity - quantity)
                # We don't change the average buy price when selling
            
            portfolio.save()
        except Exception as e:
            # Log the error but don't interrupt the trade
            print(f"Error updating portfolio: {str(e)}")
    
    @action(detail=False, methods=['get'])
    def current_prices(self, request):
        symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'DOGE', 'XRP', 'SOL', 'DOT', 'AVAX', 'MATIC']
        prices = {}
        
        # Try to use user's API keys first
        api_keys = ApiKey.objects.filter(user=request.user, is_active=True)
        if api_keys.exists():
            try:
                # Choose the first active API key
                api_key = api_keys.first()
                
                # Initialize the exchange
                if api_key.exchange == 'BINANCE':
                    exchange = ccxt.binance({
                        'apiKey': api_key.api_key,
                        'secret': api_key.api_secret,
                    })
                # Add more exchanges as needed
                
                # Fetch tickers for all symbols
                for symbol in symbols:
                    try:
                        ticker = exchange.fetch_ticker(f'{symbol}/USDT')
                        prices[symbol] = str(ticker['last'])
                    except:
                        continue
                
                return Response(prices)
            except:
                # Fallback to public API
                pass
        
        # Fallback: Use Binance public API
        for symbol in symbols:
            try:
                response = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={symbol}USDT')
                prices[symbol] = response.json()['price']
            except:
                continue
        
        return Response(prices)

class BinaryOptionTradeViewSet(viewsets.ModelViewSet):
    serializer_class = BinaryOptionTradeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BinaryOptionTrade.objects.filter(user=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Check if entry_price is provided by client
        client_entry_price = data.get('entry_price')
        
        # Only fetch price from API if entry_price is not provided
        if not client_entry_price:
            # Get current price from public API
            symbol = data.get('symbol')
            try:
                response = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={symbol}USDT')
                current_price = Decimal(response.json()['price'])
                data['entry_price'] = current_price
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f'Failed to fetch current price: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Map trade_type to direction if needed
        if 'trade_type' in data and 'direction' not in data:
            data['direction'] = 'UP' if data.pop('trade_type') == 'BUY' else 'DOWN'
        
        # Set default profit percentage if not provided
        if 'profit_percentage' not in data:
            data['profit_percentage'] = 85.0
            
        # Convert quantity to amount if needed
        if 'quantity' in data and 'amount' not in data:
            data['amount'] = data.pop('quantity')
            
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            
            # Schedule a task to process this trade when it expires
            # In a real app, this would be handled by a background task/celery
            # For demo purposes, we'll just return the created trade
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=False, methods=['get'])
    def active(self, request):
        active_trades = BinaryOptionTrade.objects.filter(
            user=request.user,
            status='ACTIVE',
            expiry_time__gt=timezone.now()
        ).order_by('-created_at')
        
        serializer = self.get_serializer(active_trades, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        # Get completed trades from the last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        completed_trades = BinaryOptionTrade.objects.filter(
            user=request.user,
            status__in=['WON', 'LOST', 'EXPIRED'],
            created_at__gte=seven_days_ago
        ).order_by('-created_at')
        
        serializer = self.get_serializer(completed_trades, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def close_early(self, request, pk=None):
        """Endpoint to close a binary option trade early (before expiry)"""
        try:
            trade = self.get_object()
            
            if trade.status != 'ACTIVE':
                return Response({
                    'status': 'error',
                    'message': 'Only active trades can be closed early'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get current price
            try:
                response = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={trade.symbol}USDT')
                current_price = Decimal(response.json()['price'])
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f'Failed to fetch current price: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Determine if the trade is winning or losing at this point
            if trade.direction == 'UP':
                is_winning = current_price > trade.entry_price
            else:  # DOWN
                is_winning = current_price < trade.entry_price
            
            # Early close usually offers a reduced payout or reduced loss
            # For simplicity, we'll use 80% of normal payout for winners
            # and 20% refund for losers
            if is_winning:
                trade.status = 'WON'
                reduced_percentage = trade.profit_percentage * Decimal('0.8')
                trade.payout_amount = trade.amount + (trade.amount * reduced_percentage / 100)
            else:
                trade.status = 'LOST'
                refund_percentage = 20
                trade.payout_amount = trade.amount * Decimal(refund_percentage) / 100
            
            trade.exit_price = current_price
            trade.save()
            
            # Update user balance
            if trade.payout_amount:
                user = request.user
                user.balance += trade.payout_amount
                user.save()
            
            serializer = self.get_serializer(trade)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_coinbase_config(request):
    """
    Get Coinbase API configuration for the authenticated user
    """
    try:
        # Get API key from environment variables
        api_key = os.getenv('EXCHANGE_API_KEY')
        api_secret = os.getenv('EXCHANGE_API_SECRET')
        sandbox_mode = os.getenv('EXCHANGE_SANDBOX_MODE', 'false').lower() == 'true'

        if not api_key or not api_secret:
            return Response({
                'error': 'Coinbase API configuration not found'
            }, status=404)

        # Create a configuration object
        config = {
            'apiKey': api_key,
            'apiSecret': api_secret,
            'sandboxMode': sandbox_mode,  # Include sandbox mode flag
            'apiEndpoint': 'https://api-public.sandbox.exchange.coinbase.com' if sandbox_mode else 'https://api.exchange.coinbase.com'
        }

        return Response({
            'apiKey': config
        })

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def update_expired_trades(request):
    """
    Check for expired trades and update their status
    Compare the entry price with the current price to determine if the trade is won or lost
    
    Optional parameters:
    - force: Process all active trades even if not expired
    - ignore_expiry: Ignore the expiry time check
    - manual_price: Use this price instead of fetching from API
    - trade_id: Process only a specific trade (by ID)
    """
    now = timezone.now()
    
    print(f"[DEBUG] update_expired_trades called at {now}. Query params: {request.query_params}")
    
    # Check if a specific trade_id was provided
    specific_trade_id = request.query_params.get('trade_id')
    if specific_trade_id:
        print(f"[DEBUG] Processing specific trade ID: {specific_trade_id}")
        # Get only the specified trade that belongs to this user
        expired_trades = BinaryOptionTrade.objects.filter(
            user=request.user,
            status='ACTIVE',
            id=specific_trade_id
        )
    else:
        # Find all active trades
        expired_trades = BinaryOptionTrade.objects.filter(
            user=request.user,
            status='ACTIVE'
        )
        
        # By default, filter to only expired trades
        if 'ignore_expiry' not in request.query_params and 'force' not in request.query_params:
            expired_trades = expired_trades.filter(expiry_time__lte=now)
    
    print(f"[DEBUG] Found {expired_trades.count()} trades to process")
    
    if not expired_trades:
        return Response({
            'status': 'success',
            'message': 'No expired trades found',
            'updated_trades': []
        })
    
    # Check if manual price is provided
    manual_price = None
    if 'manual_price' in request.query_params:
        try:
            manual_price = Decimal(request.query_params['manual_price'])
            print(f"[DEBUG] Using manual price: {manual_price}")
        except (ValueError, TypeError):
            return Response({
                'status': 'error',
                'message': 'Invalid manual price provided'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    updated_trades = []
    for trade in expired_trades:
        # Skip trades that are not yet fully expired unless explicitly told to ignore expiry
        if trade.expiry_time > now and 'ignore_expiry' not in request.query_params and 'force' not in request.query_params:
            print(f"[DEBUG] Skipping trade {trade.id} - not expired yet")
            continue
            
        try:
            print(f"[DEBUG] Processing trade {trade.id}, direction: {trade.direction}, entry_price: {trade.entry_price}")
            # Get current price - either from manual input or API
            if manual_price is not None:
                current_price = manual_price
                print(f"[DEBUG] Using provided price {current_price}")
            else:
                # Get from API as before
                print(f"[DEBUG] Fetching price from API for {trade.symbol}USDT")
                response = requests.get(f'https://api.binance.com/api/v3/ticker/price?symbol={trade.symbol}USDT')
                current_price = Decimal(response.json()['price'])
                print(f"[DEBUG] Received price from API: {current_price}")
            
            # Determine if trade won or lost based on direction and price comparison
            if trade.direction == 'UP':
                is_won = current_price > trade.entry_price
            else:  # DOWN
                is_won = current_price < trade.entry_price
                
            # Handle equal prices (draw) - count as loss for simplicity
            if current_price == trade.entry_price:
                is_won = False
                
            # Update trade status
            trade.status = 'WON' if is_won else 'LOST'
            trade.exit_price = current_price
            
            print(f"[DEBUG] Trade {trade.id} result: {trade.status} (exit_price: {trade.exit_price})")
            
            # Calculate payout
            if is_won:
                trade.payout_amount = trade.amount + (trade.amount * trade.profit_percentage / 100)
            else:
                trade.payout_amount = 0  # Full loss
                
            trade.save()
            print(f"[DEBUG] Trade {trade.id} saved successfully")
            
            # Update user balance if trade is won
            if is_won:
                user = request.user
                user.balance += trade.payout_amount
                user.save()
                print(f"[DEBUG] Updated user balance: +{trade.payout_amount}")
                
            updated_trades.append({
                'id': trade.id, 
                'status': trade.status,
                'exit_price': str(trade.exit_price),
                'payout_amount': str(trade.payout_amount)
            })
                
        except Exception as e:
            print(f"[DEBUG] Error processing trade {trade.id}: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Error updating trade {trade.id}: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    print(f"[DEBUG] Successfully updated {len(updated_trades)} trades")
    return Response({
        'status': 'success',
        'message': f'Updated {len(updated_trades)} expired trades',
        'updated_trades': updated_trades
    })
