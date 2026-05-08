from django.contrib import admin
from .models import Video, VideoLike, VideoComment, Hashtag

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('author', 'caption', 'views_count', 'created_at')

@admin.register(Hashtag)
class HashtagAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')

admin.site.register(VideoLike)
admin.site.register(VideoComment)
