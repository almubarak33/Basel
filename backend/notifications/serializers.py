from rest_framework import serializers
from .models import Notification
from users.serializers import UserMiniSerializer


class NotificationSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)
    video_thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ('id', 'sender', 'type', 'text', 'video', 'video_thumbnail', 'is_read', 'created_at')

    def get_video_thumbnail(self, obj):
        if obj.video and obj.video.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video.thumbnail.url)
        return None
