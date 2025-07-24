from django.shortcuts import render, HttpResponse
from django.http import JsonResponse
from PLive.models import ChatCalls
from django.conf import settings
import jwt
import time


def live(request):
    token = request.GET.get('token')

    if not token:
        return JsonResponse({'error': 'Token is missing'}, status=400)

    try:
        data = jwt.decode(token, settings.SHARED_SECRET_KEY, algorithms=["HS256"])

        from_csrftoken = data['from_csrftoken']
        to_csrftoken = data['to_csrftoken']
        session_uuid = data['session_uuid']
        caller_name = data['caller_name']
        callee_name = data['callee_name']
        role = data['role']

        if not ChatCalls.objects.using('envelope').filter(session_uuid=session_uuid).exists():
            return HttpResponse("UUID错误或无效！")

        if role == 'caller':
            if not ChatCalls.objects.using('envelope').filter(from_csrftoken=from_csrftoken).exists():
                return HttpResponse("角色错误或您是非法用户！")
            csrftoken = from_csrftoken
            ws_csrftoken = to_csrftoken
        elif role == 'callee':
            if not ChatCalls.objects.using('envelope').filter(to_csrftoken=to_csrftoken).exists():
                return HttpResponse("角色错误或您是非法用户！")
            csrftoken = to_csrftoken
            ws_csrftoken = from_csrftoken
        else:
            return HttpResponse("无效角色！")

        info = {
            'from_csrftoken': from_csrftoken,
            'to_csrftoken': to_csrftoken,
            'session_uuid': session_uuid,
            'caller_name': caller_name,
            'callee_name': callee_name,
            'role': 'callee',
            'exp': int(time.time()) + 60 * 5
        }

        ws_token = jwt.encode(info, settings.SHARED_SECRET_KEY, algorithm="HS256")

        print(from_csrftoken, to_csrftoken)
        return render(request, 'live.html', {
            'role': role,
            'room_uuid': session_uuid,
            'csrftoken': csrftoken,
            'caller_name': caller_name,
            'callee_name': callee_name,
            'ws_csrftoken': ws_csrftoken,
            'ws_token': ws_token
        })

    except jwt.ExpiredSignatureError:
        return HttpResponse("Token已过期")
    except jwt.InvalidTokenError:
        return HttpResponse("无效token")
