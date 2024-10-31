
from django.urls import path

from . import views

# app_name = "network"

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("post", views.generate_post, name="post"),
    path("get-username", views.get_username, name="get_username")
]
