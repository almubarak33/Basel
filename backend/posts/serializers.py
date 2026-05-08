from rest_framework import serializers
from .models import Post, Like, Comment, Hashtag, Repost
from users.serializers import UserMiniSerializer


class HashtagSerializer(serializers.ModelSerializer):
    posts_count = serializers.SerializerMethodField()

    class Meta:
        model = Hashtag
        fields = ('id', 'name', 'posts_count')

    def get_posts_count(self, obj):
        return obj.posts.count()


class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'author', 'content', 'created_at')
        read_only_fields = ('id', 'author', 'created_at')


class QuotedPostSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)

    class Meta:
        model = Post
        fields = ('id', 'author', 'content', 'image', 'video', 'created_at')


class PostSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    reposts_count = serializers.SerializerMethodField()
    quotes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_reposted = serializers.SerializerMethodField()
    quoted_post = QuotedPostSerializer(read_only=True)
    quoted_post_id = serializers.PrimaryKeyRelatedField(
        queryset=Post.objects.all(), write_only=True, required=False, allow_null=True, source='quoted_post'
    )
    hashtags = HashtagSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = (
            'id', 'author', 'content', 'image', 'video',
            'quoted_post', 'quoted_post_id', 'hashtags',
            'created_at', 'likes_count', 'comments_count',
            'reposts_count', 'quotes_count', 'is_liked', 'is_reposted',
        )
        read_only_fields = ('id', 'author', 'created_at', 'hashtags')

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_reposts_count(self, obj):
        return obj.reposts.count()

    def get_quotes_count(self, obj):
        return obj.quotes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(user=request.user, post=obj).exists()
        return False

    def get_is_reposted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Repost.objects.filter(user=request.user, post=obj).exists()
        return False
