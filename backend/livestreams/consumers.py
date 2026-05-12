import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class LiveStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        self.room = f'live_{self.stream_id}'
        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()
        await self.update_viewers(1)
        await self.channel_layer.group_send(self.room, {
            'type': 'viewer_update',
            'count': await self.get_viewers_count(),
        })

    async def disconnect(self, code):
        await self.update_viewers(-1)
        await self.channel_layer.group_send(self.room, {
            'type': 'viewer_update',
            'count': await self.get_viewers_count(),
        })
        await self.channel_layer.group_discard(self.room, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'chat':
            user = self.scope.get('user')
            if user and user.is_authenticated:
                await self.save_message(user, data.get('content', ''))
                await self.channel_layer.group_send(self.room, {
                    'type': 'chat_message',
                    'username': user.username,
                    'avatar': user.avatar.url if user.avatar else None,
                    'content': data.get('content', ''),
                })

        elif msg_type == 'end_stream':
            user = self.scope.get('user')
            if user and user.is_authenticated:
                await self.end_stream(user)
                await self.channel_layer.group_send(self.room, {'type': 'stream_ended'})

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'username': event['username'],
            'avatar': event.get('avatar'),
            'content': event['content'],
        }))

    async def viewer_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'viewers',
            'count': event['count'],
        }))

    async def stream_ended(self, event):
        await self.send(text_data=json.dumps({'type': 'stream_ended'}))

    @database_sync_to_async
    def update_viewers(self, delta):
        from .models import LiveStream
        LiveStream.objects.filter(pk=self.stream_id).update(
            viewers_count=max(0, (LiveStream.objects.get(pk=self.stream_id).viewers_count or 0) + delta)
        )

    @database_sync_to_async
    def get_viewers_count(self):
        from .models import LiveStream
        try:
            return LiveStream.objects.get(pk=self.stream_id).viewers_count
        except Exception:
            return 0

    @database_sync_to_async
    def save_message(self, user, content):
        from .models import LiveStream, LiveMessage
        try:
            stream = LiveStream.objects.get(pk=self.stream_id, is_active=True)
            LiveMessage.objects.create(stream=stream, user=user, content=content[:200])
        except Exception:
            pass

    @database_sync_to_async
    def end_stream(self, user):
        from .models import LiveStream
        LiveStream.objects.filter(pk=self.stream_id, host=user).update(
            is_active=False, ended_at=timezone.now()
        )
        user.__class__.objects.filter(pk=user.pk).update(is_live=False, live_title='')
