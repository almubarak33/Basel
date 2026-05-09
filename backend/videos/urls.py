from django.urls import path
from .views import (
    ForYouFeedView, FollowingFeedView, VideoUploadView, VideoDetailView,
    UserVideosView, HashtagVideosView, TrendingHashtagsView, SearchView,
    VideoCommentListCreateView, SavedVideosView,
    like_video, unlike_video,
    save_video, unsave_video,
    repost_video, unrepost_video,
    report_video, download_video, edit_video,
)

urlpatterns = [
    path('foryou/', ForYouFeedView.as_view()),
    path('following/', FollowingFeedView.as_view()),
    path('upload/', VideoUploadView.as_view()),
    path('search/', SearchView.as_view()),
    path('trending/', TrendingHashtagsView.as_view()),
    path('saved/', SavedVideosView.as_view()),
    path('hashtag/<str:name>/', HashtagVideosView.as_view()),
    path('<int:pk>/', VideoDetailView.as_view()),
    path('<int:pk>/like/', like_video),
    path('<int:pk>/unlike/', unlike_video),
    path('<int:pk>/save/', save_video),
    path('<int:pk>/unsave/', unsave_video),
    path('<int:pk>/repost/', repost_video),
    path('<int:pk>/unrepost/', unrepost_video),
    path('<int:pk>/comments/', VideoCommentListCreateView.as_view()),
    path('<int:pk>/report/', report_video),
    path('<int:pk>/download/', download_video),
    path('<int:pk>/edit/', edit_video),
    path('user/<str:username>/', UserVideosView.as_view()),
]
