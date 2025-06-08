"""
URL configuration for Live project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# from django.contrib import admin
from django.urls import path, include
from PLive import views

urlpatterns = [
    path('blur/', views.blur),
    path('popup/', views.popup),
    path('wss_example/', views.wss_example),
    path('fetch_get/', views.fetch_get),
    path('fetch_post/', views.fetch_post),
    path('ajax/get/', views.ajax_get),
    path('ajax/post/', views.ajax_post),
    path('', views.live),
]
