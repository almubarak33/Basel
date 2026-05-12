from django.urls import re_path
from .consumers import LiveStreamConsumer

websocket_urlpatterns = [
    re_path(r'ws/live/(?P<stream_id>\d+)/$', LiveStreamConsumer.as_asgi()),
]
