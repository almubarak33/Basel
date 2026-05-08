import os
import random
import subprocess
import tempfile
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count, F
from django.http import FileResponse, Http404
from .models import (
    Video, VideoLike, VideoComment, Hashtag,
    WatchedVideo, UserInterest, VideoReport,
    SavedVideo, Repost, PhotoSlide,
)
from .serializers import VideoSerializer, VideoCommentSerializer, HashtagSerializer


def _notify(recipient, sender, ntype, text='', video=None):
    if recipient == sender:
        return
    try:
        from notifications.models import Notification
        Notification.objects.create(
            recipient=recipient, sender=sender,
            type=ntype, text=text, video=video,
        )
    except Exception:
        pass

User = get_user_model()


def get_blocked_ids(user):
    blocking = set(user.blocking.values_list('blocked_id', flat=True))
    blocked_by = set(user.blocked_by.values_list('blocker_id', flat=True))
    return blocking | blocked_by


def _boost_interests(user, hashtag_names, delta=1):
    """Increment UserInterest scores for the given hashtags."""
    for name in hashtag_names:
        tag, _ = Hashtag.objects.get_or_create(name=name.lower())
        obj, created = UserInterest.objects.get_or_create(user=user, hashtag=tag)
        if not created:
            UserInterest.objects.filter(pk=obj.pk).update(score=F('score') + delta)


class ForYouFeedView(generics.ListAPIView):
    """FYP: interest-based > following > trending > random."""
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        blocked = get_blocked_ids(user)
        watched_ids = set(user.watched.values_list('video_id', flat=True))
        following_ids = set(user.following.values_list('following_id', flat=True))

        friend_ids = set(user.get_friends().values_list('pk', flat=True))

        def public_or_friends(qs, author_ids=None):
            """Filter videos by visibility rules."""
            from django.db.models import Q
            q = Q(visibility='public')
            if friend_ids:
                q |= Q(visibility='friends', author_id__in=friend_ids)
            q |= Q(author=user)  # own videos always visible
            return qs.filter(q)

        # Tier 1: videos whose hashtags match user's top interests (personalized)
        top_tags = list(
            user.interests.order_by('-score').values_list('hashtag_id', flat=True)[:10]
        )
        interest_vids = []
        if top_tags:
            interest_vids = list(
                public_or_friends(
                    Video.objects.filter(hashtags__in=top_tags)
                    .exclude(author_id__in=blocked)
                    .exclude(id__in=watched_ids)
                    .exclude(author=user)
                    .distinct()
                ).order_by('-created_at')[:20]
            )

        # Tier 2: videos from followed users (unseen)
        following_vids = list(
            public_or_friends(
                Video.objects.filter(author_id__in=following_ids)
                .exclude(author_id__in=blocked)
                .exclude(id__in=watched_ids)
            ).order_by('-created_at')[:20]
        )

        # Tier 3: trending (most liked, unseen, public only)
        trending = list(
            Video.objects.filter(visibility='public')
            .annotate(like_count=Count('likes'))
            .exclude(author_id__in=blocked)
            .exclude(id__in=watched_ids)
            .exclude(author=user)
            .order_by('-like_count')[:20]
        )

        # Merge with deduplication
        seen = set()
        merged = []
        for v in interest_vids + following_vids + trending:
            if v.id not in seen:
                seen.add(v.id)
                merged.append(v)

        # Tier 4: random fallback (public videos)
        if len(merged) < 5:
            extras = list(
                Video.objects.filter(visibility='public')
                .exclude(author_id__in=blocked)
                .exclude(id__in=watched_ids)
                .order_by('?')[:20]
            )
            for v in extras:
                if v.id not in seen:
                    seen.add(v.id)
                    merged.append(v)

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
        post_type = self.request.data.get('post_type', 'video')
        video = serializer.save(author=self.request.user, post_type=post_type)

        # Handle multiple photo slides
        if post_type == 'photo':
            slides = self.request.FILES.getlist('slides')
            for i, img in enumerate(slides):
                PhotoSlide.objects.create(post=video, image=img, order=i)
        else:
            audio = self.request.FILES.get('audio_file')
            if audio:
                self._merge_audio(video, audio)

    def _merge_audio(self, video, audio_file):
        """Merge uploaded audio track into the video using ffmpeg."""
        video_path = video.video_file.path
        suffix = os.path.splitext(audio_file.name)[1] or '.mp3'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_audio:
            for chunk in audio_file.chunks():
                tmp_audio.write(chunk)
            audio_path = tmp_audio.name

        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_out:
            out_path = tmp_out.name

        try:
            subprocess.run([
                'ffmpeg', '-y',
                '-i', video_path,
                '-i', audio_path,
                '-c:v', 'copy', '-c:a', 'aac',
                '-map', '0:v:0', '-map', '1:a:0',
                '-shortest', out_path,
            ], check=True, capture_output=True)
            import shutil
            shutil.copy2(out_path, video_path)
        except subprocess.CalledProcessError:
            pass  # keep original video if merge fails
        finally:
            os.unlink(audio_path)
            if os.path.exists(out_path):
                os.unlink(out_path)


class VideoDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Video.objects.all()

    def retrieve(self, request, *args, **kwargs):
        video = self.get_object()
        Video.objects.filter(pk=video.pk).update(views_count=video.views_count + 1)
        WatchedVideo.objects.get_or_create(user=request.user, video=video)
        # Boost interests for this video's hashtags
        tag_names = list(video.hashtags.values_list('name', flat=True))
        if tag_names:
            _boost_interests(request.user, tag_names, delta=1)
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
        target = get_object_or_404(User, username=self.kwargs['username'])
        me = self.request.user
        if me == target:
            # Own profile: show everything except archive
            return Video.objects.filter(author=target).exclude(visibility='archive')
        # Is friend?
        is_friend = (
            target.followers.filter(follower=me).exists() and
            target.following.filter(following=me).exists()
        )
        from django.db.models import Q
        q = Q(visibility='public')
        if is_friend:
            q |= Q(visibility='friends')
        return Video.objects.filter(author=target).filter(q)


class SavedVideosView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        saved_ids = self.request.user.saved_videos.values_list('video_id', flat=True)
        return Video.objects.filter(pk__in=saved_ids)


class HashtagVideosView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        name = self.kwargs['name'].lower()
        tag = get_object_or_404(Hashtag, name=name)
        blocked = get_blocked_ids(self.request.user)
        # Boost interest for this hashtag
        _boost_interests(self.request.user, [name], delta=2)
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
        q = self.request.query_params.get('q', '').strip()
        if not q:
            return Video.objects.none()
        blocked = get_blocked_ids(self.request.user)
        # Boost interest for hashtag-style search terms
        import re
        tags = re.findall(r'#?(\w+)', q)
        if tags:
            _boost_interests(self.request.user, tags, delta=3)
        return Video.objects.filter(caption__icontains=q).exclude(author_id__in=blocked)


class VideoCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = VideoCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VideoComment.objects.filter(video_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        video = get_object_or_404(Video, pk=self.kwargs['pk'])
        comment = serializer.save(author=self.request.user, video=video)
        _notify(video.author, self.request.user, 'comment',
                f'@{self.request.user.username} commented on your video.', video=video)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def like_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    _, created = VideoLike.objects.get_or_create(user=request.user, video=video)
    if created:
        _notify(video.author, request.user, 'like',
                f'@{request.user.username} liked your video.', video=video)
    return Response({'likes_count': video.likes.count(), 'is_liked': True})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unlike_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    VideoLike.objects.filter(user=request.user, video=video).delete()
    return Response({'likes_count': video.likes.count(), 'is_liked': False})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def save_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    SavedVideo.objects.get_or_create(user=request.user, video=video)
    return Response({'saved': True, 'saves_count': video.saved_by.count()})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unsave_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    SavedVideo.objects.filter(user=request.user, video=video).delete()
    return Response({'saved': False, 'saves_count': video.saved_by.count()})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def repost_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    if video.author == request.user:
        return Response({'detail': 'Cannot repost your own video.'}, status=400)
    _, created = Repost.objects.get_or_create(user=request.user, video=video)
    if created:
        _notify(video.author, request.user, 'repost',
                f'@{request.user.username} reposted your video.', video=video)
    return Response({'reposted': True, 'reposts_count': video.reposts.count()})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unrepost_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    Repost.objects.filter(user=request.user, video=video).delete()
    return Response({'reposted': False, 'reposts_count': video.reposts.count()})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def report_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    reason = request.data.get('reason', 'other')
    if reason not in dict(VideoReport.REASONS):
        reason = 'other'
    _, created = VideoReport.objects.get_or_create(
        video=video, reporter=request.user,
        defaults={'reason': reason},
    )
    # Auto-flag if too many reports
    report_count = video.reports.count()
    if report_count >= 5:
        Video.objects.filter(pk=pk).update(is_flagged=True)
    return Response({'reported': True, 'already_reported': not created})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_video(request, pk):
    """Stream video with SayHi watermark burned in via ffmpeg."""
    video = get_object_or_404(Video, pk=pk)
    input_path = video.video_file.path

    if not os.path.exists(input_path):
        raise Http404

    out_path = tempfile.mktemp(suffix='.mp4')
    try:
        subprocess.run([
            'ffmpeg', '-y', '-i', input_path,
            '-vf', (
                "drawtext=text='@SayHi':"
                "x=w-tw-15:y=h-th-15:"
                "fontsize=28:fontcolor=white:"
                "box=1:boxcolor=black@0.45:boxborderw=6"
            ),
            '-codec:a', 'copy',
            '-preset', 'ultrafast',
            out_path,
        ], check=True, capture_output=True, timeout=120)
        serve_path = out_path
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        serve_path = input_path  # fallback without watermark

    # FileResponse closes the file handle after sending; temp file persists until OS cleanup
    response = FileResponse(
        open(serve_path, 'rb'),
        content_type='video/mp4',
        as_attachment=True,
        filename=f'sayhi_{pk}.mp4',
    )
    response['X-Accel-Buffering'] = 'no'
    return response
