from django.contrib import admin
from .models import LiveStream, LiveMessage

@admin.register(LiveStream)
class LiveStreamAdmin(admin.ModelAdmin):
    list_display = ('host', 'title', 'viewers_count', 'is_active', 'started_at')

admin.site.register(LiveMessage)
