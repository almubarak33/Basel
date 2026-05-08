from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Follow
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


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
        return Response({'detail': 'Cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
    Follow.objects.get_or_create(follower=request.user, following=target)
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
    serializer = UserSerializer(followers, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def following_list(request, username):
    user = get_object_or_404(User, username=username)
    following = User.objects.filter(followers__follower=user)
    serializer = UserSerializer(following, many=True, context={'request': request})
    return Response(serializer.data)
