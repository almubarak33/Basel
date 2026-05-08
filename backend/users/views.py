from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Follow, Block, FriendRequest
from .serializers import RegisterSerializer, UserSerializer, UserMiniSerializer

User = get_user_model()


def _notify(recipient, sender, ntype, text='', video=None):
    """Helper to create a notification without circular imports."""
    if recipient == sender:
        return
    try:
        from notifications.models import Notification
        Notification.objects.create(
            recipient=recipient, sender=sender,
            type=ntype, text=text, video=video,
        )
    except Exception:
        pass


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'username'
    queryset = User.objects.all()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def follow_user(request, username):
    target = get_object_or_404(User, username=username)
    if target == request.user:
        return Response({'detail': 'Cannot follow yourself.'}, status=400)
    _, created = Follow.objects.get_or_create(follower=request.user, following=target)
    if created:
        _notify(target, request.user, 'follow', f'@{request.user.username} started following you.')
    return Response({'detail': f'Now following {username}.'})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unfollow_user(request, username):
    target = get_object_or_404(User, username=username)
    Follow.objects.filter(follower=request.user, following=target).delete()
    return Response({'detail': f'Unfollowed {username}.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def followers_list(request, username):
    user = get_object_or_404(User, username=username)
    followers = User.objects.filter(following__following=user)
    serializer = UserMiniSerializer(followers, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def following_list(request, username):
    user = get_object_or_404(User, username=username)
    following = User.objects.filter(followers__follower=user)
    serializer = UserMiniSerializer(following, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def friends_list(request, username):
    user = get_object_or_404(User, username=username)
    friends = user.get_friends()
    serializer = UserMiniSerializer(friends, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_friend_request(request, username):
    receiver = get_object_or_404(User, username=username)
    if receiver == request.user:
        return Response({'detail': 'Cannot send request to yourself.'}, status=400)
    req, created = FriendRequest.objects.get_or_create(
        sender=request.user, receiver=receiver,
        defaults={'status': 'pending'}
    )
    if created:
        _notify(receiver, request.user, 'friend_request',
                f'@{request.user.username} sent you a friend request.')
    return Response({'status': req.status, 'created': created})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def respond_friend_request(request, pk):
    """Accept or reject a received friend request."""
    req = get_object_or_404(FriendRequest, pk=pk, receiver=request.user, status='pending')
    action = request.data.get('action')
    if action == 'accept':
        req.status = 'accepted'
        req.save()
        # Mutual follow to make them friends
        Follow.objects.get_or_create(follower=request.user, following=req.sender)
        Follow.objects.get_or_create(follower=req.sender, following=request.user)
        _notify(req.sender, request.user, 'friend_accept',
                f'@{request.user.username} accepted your friend request.')
    elif action == 'reject':
        req.status = 'rejected'
        req.save()
    return Response({'status': req.status})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pending_friend_requests(request):
    """Received friend requests still pending."""
    reqs = FriendRequest.objects.filter(receiver=request.user, status='pending').select_related('sender')
    data = [
        {
            'id': r.pk,
            'sender': UserMiniSerializer(r.sender).data,
            'created_at': r.created_at,
        }
        for r in reqs
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def block_user(request, username):
    target = get_object_or_404(User, username=username)
    if target == request.user:
        return Response({'detail': 'Cannot block yourself.'}, status=400)
    Block.objects.get_or_create(blocker=request.user, blocked=target)
    Follow.objects.filter(follower=request.user, following=target).delete()
    Follow.objects.filter(follower=target, following=request.user).delete()
    return Response({'detail': f'Blocked {username}.'})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def unblock_user(request, username):
    target = get_object_or_404(User, username=username)
    Block.objects.filter(blocker=request.user, blocked=target).delete()
    return Response({'detail': f'Unblocked {username}.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def blocked_list(request):
    blocked = User.objects.filter(blocked_by__blocker=request.user)
    serializer = UserSerializer(blocked, many=True, context={'request': request})
    return Response(serializer.data)
