from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPES = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('follow', 'Follow'),
        ('friend_request', 'Friend Request'),
        ('friend_accept', 'Friend Accept'),
        ('repost', 'Repost'),
        ('mention', 'Mention'),
        ('message', 'Message'),
    ]
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sent_notifications'
    )
    type = models.CharField(max_length=20, choices=TYPES)
    video = models.ForeignKey(
        'videos.Video', on_delete=models.CASCADE,
        null=True, blank=True, related_name='+'
    )
    text = models.CharField(max_length=200, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
