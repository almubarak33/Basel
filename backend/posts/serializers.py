from rest_framework import serializers
from .models import Post, Like, Comment
from users.serializers import UserMiniSerializer


class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'author', 'content', 'created_at')
        read_only_fields = ('id', 'author', 'created_at')


class PostSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            'id', 'author', 'content', 'image',
            'created_at', 'likes_count', 'comments_count', 'is_liked',
        )
        read_only_fields = ('id', 'author', 'created_at')

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(user=request.user, post=obj).exists()
        return False
