from rest_framework import serializers
from .models import Video, VideoLike, VideoComment, Hashtag
from users.serializers import UserMiniSerializer


class HashtagSerializer(serializers.ModelSerializer):
    videos_count = serializers.SerializerMethodField()

    class Meta:
        model = Hashtag
        fields = ('id', 'name', 'videos_count')

    def get_videos_count(self, obj):
        return obj.videos.count()


class VideoCommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)

    class Meta:
        model = VideoComment
        fields = ('id', 'author', 'content', 'created_at')
        read_only_fields = ('id', 'author', 'created_at')


class VideoSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    hashtags = HashtagSerializer(many=True, read_only=True)

    class Meta:
        model = Video
        fields = (
            'id', 'author', 'video_file', 'thumbnail', 'caption',
            'hashtags', 'views_count', 'likes_count', 'comments_count',
            'is_liked', 'created_at',
        )
        read_only_fields = ('id', 'author', 'views_count', 'created_at', 'hashtags')

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return VideoLike.objects.filter(user=request.user, video=obj).exists()
        return False
