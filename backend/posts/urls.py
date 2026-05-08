from django.urls import path
from .views import (
    FeedView, ExploreView, PostCreateView, PostDetailView,
    UserPostsView, like_post, unlike_post, CommentListCreateView,
)

urlpatterns = [
    path('feed/', FeedView.as_view(), name='feed'),
    path('explore/', ExploreView.as_view(), name='explore'),
    path('create/', PostCreateView.as_view(), name='post_create'),
    path('<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    path('<int:pk>/like/', like_post, name='like_post'),
    path('<int:pk>/unlike/', unlike_post, name='unlike_post'),
    path('<int:pk>/comments/', CommentListCreateView.as_view(), name='post_comments'),
    path('user/<str:username>/', UserPostsView.as_view(), name='user_posts'),
]
