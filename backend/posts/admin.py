from django.contrib import admin
from .models import Post, Like, Comment

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('author', 'content', 'created_at')
    list_filter = ('created_at',)

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'created_at')

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at')
