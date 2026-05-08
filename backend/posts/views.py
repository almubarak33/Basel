from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Post, Like, Comment
from .serializers import PostSerializer, CommentSerializer

User = get_user_model()


class FeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        following_ids = self.request.user.following.values_list('following_id', flat=True)
        return Post.objects.filter(author_id__in=list(following_ids) + [self.request.user.id])


class ExploreView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Post.objects.all()


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


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        post = get_object_or_404(Post, pk=self.kwargs['pk'])
        serializer.save(author=self.request.user, post=post)
