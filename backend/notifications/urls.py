from django.urls import path
from .views import NotificationListView, mark_all_read, unread_count

urlpatterns = [
    path('', NotificationListView.as_view()),
    path('read/', mark_all_read),
    path('unread/', unread_count),
]
