from rest_framework import serializers
from .models import Conversation, Message
from users.serializers import UserMiniSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'sender', 'content', 'is_read', 'created_at')
        read_only_fields = ('id', 'sender', 'is_read', 'created_at')


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserMiniSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'participants', 'last_message', 'unread_count', 'updated_at')

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'content': msg.content, 'sender': msg.sender.username, 'created_at': msg.created_at}
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.unread_count(request.user)
        return 0
