import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return

        self.conv_id = self.scope['url_route']['kwargs']['conv_id']
        self.group = f'chat_{self.conv_id}'

        if not await self._is_participant():
            await self.close()
            return

        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except ValueError:
            return
        if data.get('type') != 'message':
            return
        content = data.get('content', '').strip()
        if not content or len(content) > 2000:
            return

        msg_data = await self._save_message(content)
        await self.channel_layer.group_send(self.group, {
            'type': 'chat_message',
            'message': msg_data,
        })

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
        }))

    @database_sync_to_async
    def _is_participant(self):
        return Conversation.objects.filter(
            pk=self.conv_id, participants=self.user
        ).exists()

    @database_sync_to_async
    def _save_message(self, content):
        conv = Conversation.objects.get(pk=self.conv_id)
        msg = Message.objects.create(
            conversation=conv, sender=self.user, content=content
        )
        Conversation.objects.filter(pk=conv.pk).update(updated_at=msg.created_at)
        avatar = self.user.avatar.url if self.user.avatar else None
        return {
            'id': msg.pk,
            'content': msg.content,
            'is_read': False,
            'created_at': msg.created_at.isoformat(),
            'sender': {
                'id': self.user.pk,
                'username': self.user.username,
                'avatar': avatar,
            },
        }
