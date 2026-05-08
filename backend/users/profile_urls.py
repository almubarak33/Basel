from django.urls import path
from .views import UserProfileView, follow_user, unfollow_user, followers_list, following_list

urlpatterns = [
    path('<str:username>/', UserProfileView.as_view(), name='user_profile'),
    path('<str:username>/follow/', follow_user, name='follow_user'),
    path('<str:username>/unfollow/', unfollow_user, name='unfollow_user'),
    path('<str:username>/followers/', followers_list, name='followers_list'),
    path('<str:username>/following/', following_list, name='following_list'),
]
