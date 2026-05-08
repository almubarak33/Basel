from django.urls import path
from .views import (
    FeedView, ExploreView, PostCreateView, PostDetailView,
    UserPostsView, like_post, unlike_post, repost, unrepost,
    CommentListCreateView, HashtagPostsView, TrendingHashtagsView, SearchView,
)

urlpatterns = [
    path('feed/', FeedView.as_view(), name='feed'),
    path('explore/', ExploreView.as_view(), name='explore'),
    path('create/', PostCreateView.as_view(), name='post_create'),
    path('search/', SearchView.as_view(), name='search'),
    path('trending/', TrendingHashtagsView.as_view(), name='trending'),
    path('hashtag/<str:name>/', HashtagPostsView.as_view(), name='hashtag_posts'),
    path('<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    path('<int:pk>/like/', like_post, name='like_post'),
    path('<int:pk>/unlike/', unlike_post, name='unlike_post'),
    path('<int:pk>/repost/', repost, name='repost'),
    path('<int:pk>/unrepost/', unrepost, name='unrepost'),
    path('<int:pk>/comments/', CommentListCreateView.as_view(), name='post_comments'),
    path('user/<str:username>/', UserPostsView.as_view(), name='user_posts'),
]
