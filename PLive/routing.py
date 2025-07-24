from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/signaling/(?P<room_name>\w+)/$",
        consumers.SignalingConsumer.as_asgi()
    ),
    re_path(
        r"ws/session/(?P<session_name>\w+)/$",
        consumers.SessionConsumer.as_asgi()
    ),
]
