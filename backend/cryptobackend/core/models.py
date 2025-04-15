from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """Custom user model with additional fields"""
    email = models.EmailField(_('email address'), unique=True)
    balance = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

class ApiKey(models.Model):
    """Model to store third-party exchange API credentials"""
    EXCHANGE_CHOICES = (
        ('BINANCE', 'Binance'),
        ('COINBASE', 'Coinbase'),
        ('KRAKEN', 'Kraken'),
        ('KUCOIN', 'KuCoin'),
        ('BITFINEX', 'Bitfinex'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    exchange = models.CharField(max_length=20, choices=EXCHANGE_CHOICES)
    api_key = models.CharField(max_length=255)
    api_secret = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'exchange')
        
    def __str__(self):
        return f"{self.user.email} - {self.exchange} API Key"

class Portfolio(models.Model):
    """Model to track user's cryptocurrency holdings"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portfolio')
    symbol = models.CharField(max_length=20)  # e.g., 'BTC', 'ETH'
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    average_buy_price = models.DecimalField(max_digits=20, decimal_places=8)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'symbol')

    def __str__(self):
        return f"{self.user.email} - {self.symbol}: {self.quantity}"

class Trade(models.Model):
    """Model to track all trades"""
    TRADE_TYPES = (
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trades')
    symbol = models.CharField(max_length=20)
    trade_type = models.CharField(max_length=4, choices=TRADE_TYPES)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    price = models.DecimalField(max_digits=20, decimal_places=8)
    total_amount = models.DecimalField(max_digits=20, decimal_places=8)
    timestamp = models.DateTimeField(auto_now_add=True)
    exchange = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.trade_type} {self.quantity} {self.symbol} @ {self.price}"

class BinaryOptionTrade(models.Model):
    """Model to track binary option trades"""
    DIRECTION_CHOICES = (
        ('UP', 'Higher'),
        ('DOWN', 'Lower'),
    )
    
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('WON', 'Won'),
        ('LOST', 'Lost'),
        ('EXPIRED', 'Expired'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='binary_options')
    symbol = models.CharField(max_length=20)
    direction = models.CharField(max_length=4, choices=DIRECTION_CHOICES)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    profit_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=85.00)
    entry_price = models.DecimalField(max_digits=20, decimal_places=8)
    expiry_time = models.DateTimeField()
    expiry_seconds = models.IntegerField()
    exit_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    payout_amount = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.symbol} {self.direction} ${self.amount} @ {self.entry_price}"
