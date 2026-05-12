from django.urls import path
from .views import (
    UserProfileView, follow_user, unfollow_user,
    followers_list, following_list, friends_list,
    send_friend_request, respond_friend_request, pending_friend_requests,
    block_user, unblock_user, blocked_list, search_users,
)

urlpatterns = [
    path('search/', search_users),
    path('blocked/', blocked_list),
    path('friend-requests/', pending_friend_requests),
    path('friend-requests/<int:pk>/respond/', respond_friend_request),
    path('<str:username>/', UserProfileView.as_view()),
    path('<str:username>/follow/', follow_user),
    path('<str:username>/unfollow/', unfollow_user),
    path('<str:username>/followers/', followers_list),
    path('<str:username>/following/', following_list),
    path('<str:username>/friends/', friends_list),
    path('<str:username>/friend-request/', send_friend_request),
    path('<str:username>/block/', block_user),
    path('<str:username>/unblock/', unblock_user),
]
