from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _user_from_jwt(token_str):
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model
        token = AccessToken(token_str)
        return get_user_model().objects.get(pk=token['user_id'])
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware:
    """Extract JWT token from ?token= query param and attach user to scope."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        qs = parse_qs(scope.get('query_string', b'').decode())
        tokens = qs.get('token', [])
        scope['user'] = await _user_from_jwt(tokens[0]) if tokens else AnonymousUser()
        return await self.inner(scope, receive, send)
