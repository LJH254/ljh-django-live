from channels.generic.websocket import AsyncWebsocketConsumer
import json

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"webrtc_room_{self.room_name}"

        # 加入房间组
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # 离开房间组
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # 接收前端 WebSocket 消息
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        # 广播给房间内其他用户
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_signal',
                'data': data,
                'sender_channel_name': self.channel_name
            }
        )

    # 处理 WebRTC 信令
    async def webrtc_signal(self, event):
        # 不转发给自己
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['data']))