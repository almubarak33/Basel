from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from users.models import Block
        blocked_ids = set(
            Block.objects.filter(blocker=self.request.user).values_list('blocked_id', flat=True)
        ) | set(
            Block.objects.filter(blocked=self.request.user).values_list('blocker_id', flat=True)
        )
        qs = self.request.user.conversations.prefetch_related('participants', 'messages')
        if blocked_ids:
            qs = qs.exclude(participants__pk__in=blocked_ids)
        return qs


class ConversationDetailView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv = get_object_or_404(Conversation, pk=self.kwargs['pk'])
        if not conv.participants.filter(pk=self.request.user.pk).exists():
            return Message.objects.none()
        # Mark all incoming messages as read
        conv.messages.exclude(sender=self.request.user).update(is_read=True)
        return conv.messages.all()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def get_or_create_conversation(request, username):
    """Return existing conversation with user or create a new one."""
    other = get_object_or_404(User, username=username)
    if other == request.user:
        return Response({'detail': 'Cannot message yourself.'}, status=400)

    # Find a conversation with exactly these two participants
    conv = (
        Conversation.objects
        .filter(participants=request.user)
        .filter(participants=other)
        .first()
    )
    if not conv:
        conv = Conversation.objects.create()
        conv.participants.set([request.user, other])

    return Response({'conversation_id': conv.pk})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_message(request, pk):
    conv = get_object_or_404(Conversation, pk=pk)
    if not conv.participants.filter(pk=request.user.pk).exists():
        return Response({'detail': 'Not allowed.'}, status=403)

    # Block check: neither party should have blocked the other
    from users.models import Block
    other_ids = conv.participants.exclude(pk=request.user.pk).values_list('pk', flat=True)
    if Block.objects.filter(blocker=request.user, blocked_id__in=other_ids).exists() or \
       Block.objects.filter(blocked=request.user, blocker_id__in=other_ids).exists():
        return Response({'detail': 'Cannot message a blocked user.'}, status=403)

    content = request.data.get('content', '').strip()
    if not content:
        return Response({'detail': 'Message cannot be empty.'}, status=400)

    msg = Message.objects.create(conversation=conv, sender=request.user, content=content)
    # Touch updated_at
    Conversation.objects.filter(pk=conv.pk).update(updated_at=msg.created_at)

    return Response(MessageSerializer(msg).data, status=201)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_messages_count(request):
    count = 0
    for conv in request.user.conversations.all():
        count += conv.unread_count(request.user)
    return Response({'unread': count})
