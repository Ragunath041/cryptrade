from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Portfolio, Trade, ApiKey, BinaryOptionTrade
from datetime import datetime, timedelta

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'balance')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class ApiKeySerializer(serializers.ModelSerializer):
    api_secret = serializers.CharField(write_only=True)
    
    class Meta:
        model = ApiKey
        fields = ('id', 'exchange', 'api_key', 'api_secret', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')

class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ('id', 'symbol', 'quantity', 'average_buy_price', 'last_updated')
        read_only_fields = ('last_updated',)

class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = ('id', 'symbol', 'trade_type', 'quantity', 'price', 'total_amount', 'timestamp', 'exchange')
        read_only_fields = ('timestamp',)

    def validate(self, data):
        if data['quantity'] <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        if data['price'] <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return data

class BinaryOptionTradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinaryOptionTrade
        fields = (
            'id', 'symbol', 'direction', 'amount', 'profit_percentage', 
            'entry_price', 'expiry_time', 'expiry_seconds', 'exit_price', 
            'status', 'payout_amount', 'created_at'
        )
        read_only_fields = ('exit_price', 'status', 'payout_amount', 'created_at', 'expiry_time')
    
    def validate(self, data):
        if data['amount'] <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        if data['expiry_seconds'] not in [60, 300, 900, 3600]:
            raise serializers.ValidationError("Expiry time must be 1, 5, 15 minutes or 1 hour")
        return data
    
    def create(self, validated_data):
        # Calculate the expiry time based on current time + expiry_seconds
        expiry_time = datetime.now() + timedelta(seconds=validated_data['expiry_seconds'])
        validated_data['expiry_time'] = expiry_time
        
        # Convert trade_type to direction (if needed)
        if 'trade_type' in validated_data:
            validated_data['direction'] = 'UP' if validated_data.pop('trade_type') == 'BUY' else 'DOWN'
        
        # Set the entry price from the current price
        # In a real app, we would get this from the exchange API
        # For this demo, we'll set a dummy price or get it from the request
        if 'entry_price' not in validated_data:
            # This would be replaced with actual price from an API
            validated_data['entry_price'] = 50000.00  # Dummy BTC price
        
        return super().create(validated_data) 