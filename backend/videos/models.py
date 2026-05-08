import re
import subprocess
import os
from django.db import models
from django.conf import settings


NSFW_KEYWORDS = {
    'nsfw', 'xxx', 'nude', 'naked', 'sex', 'porn', 'adult',
    'explicit', 'erotic', 'onlyfans', 'lewd', 'hentai',
}


class Hashtag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'#{self.name}'


class Video(models.Model):
    VISIBILITY = [
        ('public', 'Public'),
        ('friends', 'Friends'),
        ('private', 'Private'),
        ('archive', 'Archive'),
    ]
    POST_TYPES = [
        ('video', 'Video'),
        ('photo', 'Photo Carousel'),
    ]

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='videos')
    post_type = models.CharField(max_length=10, choices=POST_TYPES, default='video')
    video_file = models.FileField(upload_to='videos/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
    audio_file = models.FileField(upload_to='audio/', blank=True, null=True)
    caption = models.TextField(max_length=300, blank=True)
    hashtags = models.ManyToManyField(Hashtag, blank=True, related_name='videos')
    views_count = models.PositiveIntegerField(default=0)
    visibility = models.CharField(max_length=10, choices=VISIBILITY, default='public')
    is_age_restricted = models.BooleanField(default=False)
    is_flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def _check_nsfw(self):
        words = set(re.sub(r'[^a-z0-9+#]', ' ', self.caption.lower()).split())
        return bool(words & NSFW_KEYWORDS)

    def save(self, *args, **kwargs):
        if self._check_nsfw():
            self.is_age_restricted = True
        super().save(*args, **kwargs)
        tags = re.findall(r'#(\w+)', self.caption)
        self.hashtags.clear()
        for tag in set(tags):
            obj, _ = Hashtag.objects.get_or_create(name=tag.lower())
            self.hashtags.add(obj)

    def likes_count(self):
        return self.likes.count()

    def comments_count(self):
        return self.comments.count()

    def __str__(self):
        return f'{self.author.username}: {self.caption[:40]}'


class VideoLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='video_likes')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')


class VideoComment(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='video_comments')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class WatchedVideo(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watched')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='watched_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')


class UserInterest(models.Model):
    """Tracks how much a user is interested in a hashtag (higher = more interested)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='interests')
    hashtag = models.ForeignKey(Hashtag, on_delete=models.CASCADE, related_name='interested_users')
    score = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'hashtag')
        ordering = ['-score']


class SavedVideo(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_videos')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')
        ordering = ['-created_at']


class Repost(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reposts')
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='reposts')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')
        ordering = ['-created_at']


class PhotoSlide(models.Model):
    """Individual image in a photo carousel post."""
    post = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='slides')
    image = models.ImageField(upload_to='slides/')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']


class VideoReport(models.Model):
    REASONS = [
        ('nsfw', 'Sexually explicit'),
        ('violence', 'Violence'),
        ('harassment', 'Harassment'),
        ('spam', 'Spam'),
        ('other', 'Other'),
    ]
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.CharField(max_length=20, choices=REASONS)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('video', 'reporter')
