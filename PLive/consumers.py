from channels.generic.websocket import AsyncWebsocketConsumer
import json


class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"webrtc_room_{self.room_name}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_signal',
                'data': data,
                'sender_channel_name': self.channel_name
            }
        )

    async def webrtc_signal(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['data']))


class SessionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_name = self.scope['url_route']['kwargs']['session_name']
        self.room_group_name = f"webrtc_session_{self.session_name}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'session_signal',
                'data': data,
                'sender_channel_name': self.channel_name
            }
        )

    async def session_signal(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['data']))
