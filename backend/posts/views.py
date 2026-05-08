from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count
from .models import Post, Like, Comment, Hashtag, Repost
from .serializers import PostSerializer, CommentSerializer, HashtagSerializer

User = get_user_model()


def get_blocked_ids(user):
    blocking = user.blocking.values_list('blocked_id', flat=True)
    blocked_by = user.blocked_by.values_list('blocker_id', flat=True)
    return set(blocking) | set(blocked_by)


class FeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        blocked = get_blocked_ids(self.request.user)
        following_ids = self.request.user.following.values_list('following_id', flat=True)
        ids = (set(following_ids) | {self.request.user.id}) - blocked
        return Post.objects.filter(author_id__in=ids)


class ExploreView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        blocked = get_blocked_ids(self.request.user)
        return Post.objects.exclude(author_id__in=blocked)


class PostCreateView(generics.CreateAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class PostDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Post.objects.all()

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if post.author != request.user:
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class UserPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(User, username=username)
        return Post.objects.filter(author=user)


class HashtagPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tag = get_object_or_404(Hashtag, name=self.kwargs['name'].lower())
        blocked = get_blocked_ids(self.request.user)
        return tag.posts.exclude(author_id__in=blocked)


class TrendingHashtagsView(generics.ListAPIView):
    serializer_class = HashtagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Hashtag.objects.annotate(count=Count('posts')).order_by('-count')[:10]


class SearchView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        blocked = get_blocked_ids(self.request.user)
        if not q:
            return Post.objects.none()
        return Post.objects.filter(content__icontains=q).exclude(author_id__in=blocked)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def like_post(request, pk):
    post = get_object_or_404(Post, pk=pk)
    Like.objects.get_or_create(user=request.user, post=post)
    return Response({'likes_count': post.likes.count(), 'is_liked': True})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unlike_post(request, pk):
    post = get_object_or_404(Post, pk=pk)
    Like.objects.filter(user=request.user, post=post).delete()
    return Response({'likes_count': post.likes.count(), 'is_liked': False})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def repost(request, pk):
    post = get_object_or_404(Post, pk=pk)
    Repost.objects.get_or_create(user=request.user, post=post)
    return Response({'reposts_count': post.reposts.count(), 'is_reposted': True})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unrepost(request, pk):
    post = get_object_or_404(Post, pk=pk)
    Repost.objects.filter(user=request.user, post=post).delete()
    return Response({'reposts_count': post.reposts.count(), 'is_reposted': False})


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        post = get_object_or_404(Post, pk=self.kwargs['pk'])
        serializer.save(author=self.request.user, post=post)
