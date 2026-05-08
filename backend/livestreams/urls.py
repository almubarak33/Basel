from django.urls import path
from .views import ActiveStreamsView, StreamDetailView, start_stream, end_stream

urlpatterns = [
    path('', ActiveStreamsView.as_view()),
    path('start/', start_stream),
    path('<int:pk>/', StreamDetailView.as_view()),
    path('<int:pk>/end/', end_stream),
]
