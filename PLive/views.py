from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

# ------------------------- Example -------------------------

# GET 请求示例：返回任务列表
@require_http_methods(["GET"])
def ajax_get(request):
    tasks = ['a','b','c','d','e','f']
    return JsonResponse(tasks, safe=False)  # 转为 JSON 响应


# POST 请求示例：接收 JSON 数据并创建任务
@require_http_methods(["POST"])
def ajax_post(request):
    try:
        # 解析前端发送的 JSON 数据
        data = json.loads(request.body)
        title = data.get('title')
        return JsonResponse({'id': 1, 'title': title}, status=201)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


def blur(request):
    return render(request, 'examples/blur.html')

def popup(request):
    return render(request, 'examples/popup.html')

def wss_example(request):
    try:
        csrfToken = request.COOKIES['csrftoken']
    except KeyError as ke:  # 有时候cookies中不会夹带csrftoken键，很奇怪。此时强制刷新即可。
        print(ke)
        return redirect('/wss_example/')
    return render(request, 'examples/wsstest.html', {'csrfToken':csrfToken})

def fetch_get(request):
    return render(request, 'examples/fetch_get.html')

def fetch_post(request):
    return render(request, 'examples/fetch_post.html')

# ------------------------- Example -------------------------

def live(request):
    return render(request, 'live.html')
