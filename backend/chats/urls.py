from django.urls import path
from .views import (
    ConversationListView, ConversationDetailView,
    get_or_create_conversation, send_message, unread_messages_count,
)

urlpatterns = [
    path('', ConversationListView.as_view()),
    path('unread/', unread_messages_count),
    path('with/<str:username>/', get_or_create_conversation),
    path('<int:pk>/', ConversationDetailView.as_view()),
    path('<int:pk>/send/', send_message),
]
