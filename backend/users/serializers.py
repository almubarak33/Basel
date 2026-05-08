from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Follow, Block, FriendRequest

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    videos_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    friends_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    is_friend = serializers.SerializerMethodField()
    friend_request_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'bio', 'avatar', 'website',
            'location', 'is_live', 'live_title', 'is_private', 'date_joined',
            'followers_count', 'following_count', 'videos_count', 'likes_count',
            'friends_count', 'is_following', 'is_blocked', 'is_friend',
            'friend_request_status',
        )
        read_only_fields = ('id', 'date_joined', 'is_live', 'live_title')

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_videos_count(self, obj):
        return obj.videos.count()

    def get_likes_count(self, obj):
        return sum(v.likes.count() for v in obj.videos.all())

    def get_friends_count(self, obj):
        return obj.get_friends().count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False

    def get_is_blocked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Block.objects.filter(blocker=request.user, blocked=obj).exists()
        return False

    def get_is_friend(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user != obj:
            u = request.user
            follows_obj = Follow.objects.filter(follower=u, following=obj).exists()
            obj_follows_u = Follow.objects.filter(follower=obj, following=u).exists()
            return follows_obj and obj_follows_u
        return False

    def get_friend_request_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user != obj:
            req = FriendRequest.objects.filter(
                sender=request.user, receiver=obj
            ).first()
            if req:
                return req.status
        return None


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'avatar', 'is_live', 'is_private')
