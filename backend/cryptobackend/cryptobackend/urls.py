"""
URL configuration for cryptobackend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import UserViewSet, PortfolioViewSet, TradeViewSet, ApiKeyViewSet, BinaryOptionTradeViewSet, get_coinbase_config, update_expired_trades

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'portfolio', PortfolioViewSet, basename='portfolio')
router.register(r'trades', TradeViewSet, basename='trades')
router.register(r'api-keys', ApiKeyViewSet, basename='api-keys')
router.register(r'binary-options', BinaryOptionTradeViewSet, basename='binary-options')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/config/coinbase/', get_coinbase_config, name='get_coinbase_config'),
    path('api/check-trades/', update_expired_trades, name='update_expired_trades'),
]
