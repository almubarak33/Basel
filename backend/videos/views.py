import logging
import os
import random
import shutil
import subprocess
import tempfile

logger = logging.getLogger(__name__)
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
    SavedVideo, Repost, PhotoSlide, HashtagSubscription,
)
from .serializers import VideoSerializer, VideoCommentSerializer, HashtagSerializer


def _notify(recipient, sender, ntype, text='', video=None):
    if recipient == sender:
        return
    try:
        from notifications.models import Notification
        notif = Notification.objects.create(
            recipient=recipient, sender=sender,
            type=ntype, text=text, video=video,
        )
        # Push over WebSocket so recipient gets instant notification
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        avatar = sender.avatar.url if (sender and sender.avatar) else None
        payload = {
            'id': notif.pk,
            'type': ntype,
            'text': text,
            'is_read': False,
            'created_at': notif.created_at.isoformat(),
            'sender': {'username': sender.username, 'avatar': avatar} if sender else None,
            'video_thumbnail': video.thumbnail.url if (video and video.thumbnail) else None,
        }
        async_to_sync(get_channel_layer().group_send)(
            f'notifications_{recipient.pk}',
            {'type': 'push_notification', 'data': payload},
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

        if post_type == 'photo':
            slides = self.request.FILES.getlist('slides')
            for i, img in enumerate(slides):
                PhotoSlide.objects.create(post=video, image=img, order=i)
        else:
            # Trim before audio merge so duration is correct when merging
            try:
                trim_start = float(self.request.data.get('trim_start') or 0)
                trim_end   = float(self.request.data.get('trim_end')   or 0)
            except (TypeError, ValueError):
                trim_start = trim_end = 0.0

            if trim_end > 0 and trim_end > trim_start:
                self._trim_video(video, trim_start, trim_end)

            audio = self.request.FILES.get('audio_file')
            if audio:
                self._merge_audio(video, audio)

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _probe_duration(path: str):
        """Return duration in seconds via ffprobe, or None on any failure."""
        try:
            result = subprocess.run(
                [
                    'ffprobe', '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    path,
                ],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode == 0:
                return float(result.stdout.strip())
        except Exception:
            pass
        return None

    def _trim_video(self, video, start: float, end: float) -> bool:
        """
        Re-encode video to the exact [start, end] range and replace the
        original file.  Returns True on success, False if skipped/failed
        (original file is preserved in all failure cases).
        """
        video_path = video.video_file.path
        if not os.path.exists(video_path):
            return False

        # Sanitise inputs
        start = max(0.0, round(start, 3))
        end   = round(end, 3)
        if end <= start:
            return False

        # Clamp end to actual file duration so we don't request beyond EOF
        actual = self._probe_duration(video_path)
        if actual is not None:
            end = min(end, round(actual, 3))
            if end <= start:
                return False

        out_path = None
        try:
            fd, out_path = tempfile.mkstemp(suffix='.mp4')
            os.close(fd)

            result = subprocess.run(
                [
                    'ffmpeg', '-y',
                    '-i', video_path,
                    # Output-side -ss/-to gives frame-accurate cuts via re-encode
                    '-ss', f'{start:.3f}',
                    '-to', f'{end:.3f}',
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '23',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-avoid_negative_ts', 'make_zero',
                    '-movflags', '+faststart',
                    out_path,
                ],
                capture_output=True,
                timeout=300,
            )

            if result.returncode != 0:
                logger.warning(
                    'ffmpeg trim failed for video %s (rc=%d): %s',
                    video.pk,
                    result.returncode,
                    result.stderr.decode('utf-8', errors='replace')[-600:],
                )
                return False

            # Sanity-check the output before replacing the original
            if os.path.getsize(out_path) < 1024:
                logger.warning('ffmpeg trim produced empty output for video %s', video.pk)
                return False

            trimmed_dur = self._probe_duration(out_path)
            expected    = end - start
            if trimmed_dur is not None and abs(trimmed_dur - expected) > 2.0:
                logger.warning(
                    'Trim duration mismatch for video %s: expected %.2fs got %.2fs',
                    video.pk, expected, trimmed_dur,
                )
                # Still use the output — ffmpeg succeeded; log only for diagnostics

            shutil.move(out_path, video_path)
            out_path = None  # ownership transferred; skip cleanup
            return True

        except subprocess.TimeoutExpired:
            logger.warning('ffmpeg trim timed out for video %s', video.pk)
            return False
        except Exception:
            logger.exception('Unexpected error trimming video %s', video.pk)
            return False
        finally:
            if out_path and os.path.exists(out_path):
                os.unlink(out_path)

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
            result = subprocess.run(
                [
                    'ffmpeg', '-y',
                    '-i', video_path,
                    '-i', audio_path,
                    '-c:v', 'copy', '-c:a', 'aac',
                    '-map', '0:v:0', '-map', '1:a:0',
                    '-shortest',
                    '-movflags', '+faststart',
                    out_path,
                ],
                capture_output=True,
                timeout=300,
            )
            if result.returncode == 0 and os.path.getsize(out_path) > 1024:
                shutil.move(out_path, video_path)
                out_path = None
            else:
                logger.warning(
                    'ffmpeg audio merge failed for video %s (rc=%d)',
                    video.pk, result.returncode,
                )
        except Exception:
            logger.exception('Audio merge error for video %s', video.pk)
        finally:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
            if out_path and os.path.exists(out_path):
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
        return (
            VideoComment.objects
            .filter(video_id=self.kwargs['pk'], parent__isnull=True)
            .select_related('author')
            .prefetch_related('replies__author')
        )

    def perform_create(self, serializer):
        video = get_object_or_404(Video, pk=self.kwargs['pk'])
        parent_id = self.request.data.get('parent')
        parent = None
        if parent_id:
            # Only allow replying to top-level comments on the same video
            parent = get_object_or_404(VideoComment, pk=parent_id, video=video, parent__isnull=True)

        comment = serializer.save(author=self.request.user, video=video, parent=parent)

        if parent:
            _notify(
                parent.author, self.request.user, 'reply',
                f'@{self.request.user.username} replied to your comment.',
                video=video,
            )
        else:
            _notify(
                video.author, self.request.user, 'comment',
                f'@{self.request.user.username} commented on your video.',
                video=video,
            )


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def edit_video(request, pk):
    """Update caption / visibility / age-restriction on own video."""
    video = get_object_or_404(Video, pk=pk, author=request.user)
    allowed = {'caption', 'visibility', 'is_age_restricted'}
    data = {k: v for k, v in request.data.items() if k in allowed}
    serializer = VideoSerializer(video, data=data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


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


# ─── Explore ──────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def explore_feed(request):
    """Trending videos (last 7 days) + suggested users."""
    from datetime import timedelta
    from django.utils import timezone
    from django.db.models import Count

    blocked = get_blocked_ids(request.user)
    cutoff = timezone.now() - timedelta(days=7)

    # Trending: most-liked public videos in last 7 days
    trending = (
        Video.objects
        .filter(visibility='public', created_at__gte=cutoff)
        .exclude(author_id__in=blocked)
        .annotate(score=Count('likes') + Count('reposts'))
        .order_by('-score', '-views_count')[:30]
    )

    # Suggested users: not yet followed, ordered by follower count
    following_ids = set(request.user.following.values_list('following_id', flat=True))
    following_ids.add(request.user.pk)
    suggested_users = (
        User.objects
        .exclude(pk__in=following_ids | blocked)
        .filter(is_active=True)
        .annotate(followers_count=Count('followers'))
        .order_by('-followers_count')[:10]
    )

    from users.serializers import UserMiniSerializer
    return Response({
        'trending': VideoSerializer(trending, many=True, context={'request': request}).data,
        'suggested_users': UserMiniSerializer(suggested_users, many=True).data,
    })


# ─── Hashtag Subscriptions ────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def subscribe_hashtag(request, name):
    tag = get_object_or_404(Hashtag, name=name.lower())
    HashtagSubscription.objects.get_or_create(user=request.user, hashtag=tag)
    return Response({'subscribed': True})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unsubscribe_hashtag(request, name):
    tag = get_object_or_404(Hashtag, name=name.lower())
    HashtagSubscription.objects.filter(user=request.user, hashtag=tag).delete()
    return Response({'subscribed': False})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def hashtag_subscription_status(request, name):
    tag = Hashtag.objects.filter(name=name.lower()).first()
    if not tag:
        return Response({'subscribed': False})
    subscribed = HashtagSubscription.objects.filter(user=request.user, hashtag=tag).exists()
    return Response({'subscribed': subscribed})


class SubscriptionsFeedView(generics.ListAPIView):
    """Videos from hashtags the user subscribed to."""
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        blocked = get_blocked_ids(self.request.user)
        subscribed_tags = self.request.user.hashtag_subscriptions.values_list('hashtag_id', flat=True)
        return (
            Video.objects
            .filter(hashtags__in=subscribed_tags, visibility='public')
            .exclude(author_id__in=blocked)
            .distinct()
            .order_by('-created_at')
        )


# ─── Admin / Moderation ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_stats(request):
    from django.db.models import Count
    return Response({
        'users':   User.objects.count(),
        'videos':  Video.objects.count(),
        'reports': VideoReport.objects.count(),
        'flagged': Video.objects.filter(is_flagged=True).count(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_reports(request):
    """Videos with at least one report, sorted by report count."""
    from django.db.models import Count
    videos = (
        Video.objects
        .annotate(report_count=Count('reports'))
        .filter(report_count__gt=0)
        .select_related('author')
        .order_by('-report_count', '-created_at')[:100]
    )
    data = []
    for v in videos:
        thumb = None
        try:
            thumb = v.thumbnail.url if v.thumbnail else None
        except Exception:
            pass
        reasons = list(v.reports.values_list('reason', flat=True).distinct())
        data.append({
            'id': v.pk,
            'caption': v.caption,
            'author': v.author.username,
            'thumbnail': thumb,
            'report_count': v.report_count,
            'reasons': reasons,
            'is_flagged': v.is_flagged,
            'created_at': v.created_at.isoformat(),
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_delete_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    video.delete()
    return Response({'detail': 'Deleted.'})


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_dismiss_reports(request, pk):
    video = get_object_or_404(Video, pk=pk)
    video.reports.all().delete()
    Video.objects.filter(pk=pk).update(is_flagged=False)
    return Response({'detail': 'Reports cleared.'})


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_users(request):
    q = request.GET.get('q', '').strip()
    qs = User.objects.all().order_by('-date_joined')
    if q:
        qs = qs.filter(username__icontains=q)
    data = [
        {
            'id': u.pk,
            'username': u.username,
            'email': u.email,
            'is_active': u.is_active,
            'is_staff': u.is_staff,
            'date_joined': u.date_joined.isoformat(),
            'videos_count': u.videos.count(),
        }
        for u in qs[:100]
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_toggle_ban(request, pk):
    user = get_object_or_404(User, pk=pk)
    if user.is_staff:
        return Response({'detail': 'Cannot ban staff.'}, status=403)
    user.is_active = not user.is_active
    user.save(update_fields=['is_active'])
    return Response({'is_active': user.is_active})
