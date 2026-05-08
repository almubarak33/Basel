import random
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count
from .models import Video, VideoLike, VideoComment, Hashtag, WatchedVideo
from .serializers import VideoSerializer, VideoCommentSerializer, HashtagSerializer

User = get_user_model()


def get_blocked_ids(user):
    blocking = set(user.blocking.values_list('blocked_id', flat=True))
    blocked_by = set(user.blocked_by.values_list('blocker_id', flat=True))
    return blocking | blocked_by


class ForYouFeedView(generics.ListAPIView):
    """FYP: mix of following + trending + unseen videos."""
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        blocked = get_blocked_ids(user)
        watched_ids = user.watched.values_list('video_id', flat=True)
        following_ids = user.following.values_list('following_id', flat=True)

        # Videos from following (unseen first)
        following_vids = list(
            Video.objects.filter(author_id__in=following_ids)
            .exclude(author_id__in=blocked)
            .exclude(id__in=watched_ids)
            .order_by('-created_at')[:20]
        )

        # Trending: most liked last 7 days (unseen)
        trending = list(
            Video.objects.annotate(like_count=Count('likes'))
            .exclude(author_id__in=blocked)
            .exclude(id__in=watched_ids)
            .exclude(author=user)
            .order_by('-like_count')[:20]
        )

        # Merge and deduplicate
        seen_ids = {v.id for v in following_vids}
        merged = following_vids + [v for v in trending if v.id not in seen_ids]

        if len(merged) < 5:
            # Fallback: any unwatched video
            extras = list(
                Video.objects.exclude(author_id__in=blocked)
                .exclude(id__in=watched_ids)
                .order_by('?')[:20]
            )
            seen_ids2 = {v.id for v in merged}
            merged += [v for v in extras if v.id not in seen_ids2]

        random.shuffle(merged)
        return merged[:30]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response({'results': serializer.data, 'count': len(serializer.data)})


class FollowingFeedView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        blocked = get_blocked_ids(self.request.user)
        following_ids = self.request.user.following.values_list('following_id', flat=True)
        return Video.objects.filter(author_id__in=following_ids).exclude(author_id__in=blocked)


class VideoUploadView(generics.CreateAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class VideoDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Video.objects.all()

    def retrieve(self, request, *args, **kwargs):
        video = self.get_object()
        # Mark as watched and increment views
        Video.objects.filter(pk=video.pk).update(views_count=video.views_count + 1)
        WatchedVideo.objects.get_or_create(user=request.user, video=video)
        serializer = self.get_serializer(video)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        video = self.get_object()
        if video.author != request.user:
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class UserVideosView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = get_object_or_404(User, username=self.kwargs['username'])
        return Video.objects.filter(author=user)


class HashtagVideosView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tag = get_object_or_404(Hashtag, name=self.kwargs['name'].lower())
        blocked = get_blocked_ids(self.request.user)
        return tag.videos.exclude(author_id__in=blocked)


class TrendingHashtagsView(generics.ListAPIView):
    serializer_class = HashtagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Hashtag.objects.annotate(count=Count('videos')).order_by('-count')[:15]


class SearchView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        if not q:
            return Video.objects.none()
        blocked = get_blocked_ids(self.request.user)
        return Video.objects.filter(caption__icontains=q).exclude(author_id__in=blocked)


class VideoCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = VideoCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VideoComment.objects.filter(video_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        video = get_object_or_404(Video, pk=self.kwargs['pk'])
        serializer.save(author=self.request.user, video=video)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def like_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    VideoLike.objects.get_or_create(user=request.user, video=video)
    return Response({'likes_count': video.likes.count(), 'is_liked': True})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unlike_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    VideoLike.objects.filter(user=request.user, video=video).delete()
    return Response({'likes_count': video.likes.count(), 'is_liked': False})
