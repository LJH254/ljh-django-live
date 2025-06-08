"""
ASGI config for Live project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from PLive import routing  # 替换为你的 App 路由模块

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Live.settings')

application = ProtocolTypeRouter({
    # 处理 HTTP 请求（普通 Django 视图）
    "http": get_asgi_application(),

    # 处理 WebSocket 请求
    "websocket": AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns  # 指向你的 WebSocket 路由配置
        )
    ),
})