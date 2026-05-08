from rest_framework import serializers
from .models import LiveStream, LiveMessage
from users.serializers import UserMiniSerializer


class LiveMessageSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = LiveMessage
        fields = ('id', 'user', 'content', 'created_at')


class LiveStreamSerializer(serializers.ModelSerializer):
    host = UserMiniSerializer(read_only=True)
    recent_messages = serializers.SerializerMethodField()

    class Meta:
        model = LiveStream
        fields = ('id', 'host', 'title', 'viewers_count', 'is_active', 'started_at', 'recent_messages')

    def get_recent_messages(self, obj):
        msgs = obj.messages.order_by('-created_at')[:50]
        return LiveMessageSerializer(reversed(list(msgs)), many=True).data
