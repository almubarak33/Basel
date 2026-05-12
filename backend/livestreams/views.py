from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import LiveStream
from .serializers import LiveStreamSerializer


class ActiveStreamsView(generics.ListAPIView):
    serializer_class = LiveStreamSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = LiveStream.objects.filter(is_active=True)


class StreamDetailView(generics.RetrieveAPIView):
    serializer_class = LiveStreamSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = LiveStream.objects.all()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_stream(request):
    title = request.data.get('title', 'Live Stream')
    LiveStream.objects.filter(host=request.user, is_active=True).update(
        is_active=False, ended_at=timezone.now()
    )
    stream = LiveStream.objects.create(host=request.user, title=title)
    request.user.__class__.objects.filter(pk=request.user.pk).update(
        is_live=True, live_title=title
    )
    return Response(LiveStreamSerializer(stream).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def end_stream(request, pk):
    stream = LiveStream.objects.filter(pk=pk, host=request.user, is_active=True).first()
    if stream:
        stream.is_active = False
        stream.ended_at = timezone.now()
        stream.save()
        request.user.__class__.objects.filter(pk=request.user.pk).update(is_live=False, live_title='')
    return Response({'detail': 'Stream ended.'})
