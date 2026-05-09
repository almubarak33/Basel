from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, check_username, set_username, change_password, delete_account

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('me/delete/', delete_account, name='delete_account'),
    path('check-username/', check_username, name='check_username'),
    path('set-username/', set_username, name='set_username'),
    path('change-password/', change_password, name='change_password'),
]
