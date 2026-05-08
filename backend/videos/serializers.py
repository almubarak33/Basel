from rest_framework import serializers
from .models import Video, VideoLike, VideoComment, Hashtag, SavedVideo, Repost
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
    saves_count = serializers.SerializerMethodField()
    reposts_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    is_reposted = serializers.SerializerMethodField()
    hashtags = HashtagSerializer(many=True, read_only=True)

    class Meta:
        model = Video
        fields = (
            'id', 'author', 'video_file', 'thumbnail', 'audio_file', 'caption',
            'hashtags', 'views_count', 'visibility',
            'likes_count', 'comments_count', 'saves_count', 'reposts_count',
            'is_liked', 'is_saved', 'is_reposted',
            'is_age_restricted', 'is_flagged', 'created_at',
        )
        read_only_fields = (
            'id', 'author', 'views_count', 'created_at', 'hashtags', 'is_flagged'
        )

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_saves_count(self, obj):
        return obj.saved_by.count()

    def get_reposts_count(self, obj):
        return obj.reposts.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return VideoLike.objects.filter(user=request.user, video=obj).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedVideo.objects.filter(user=request.user, video=obj).exists()
        return False

    def get_is_reposted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Repost.objects.filter(user=request.user, video=obj).exists()
        return False
