import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
import livestreams.routing
import chats.routing
import notifications.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sayhi.settings')

from sayhi.middleware import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JWTAuthMiddleware(
        URLRouter(
            livestreams.routing.websocket_urlpatterns +
            chats.routing.websocket_urlpatterns +
            notifications.routing.websocket_urlpatterns
        )
    ),
})
