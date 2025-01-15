
from django.urls import path

from . import views

# app_name = "network"

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("<int:page_number>", views.index, name="index"),
    path("follow", views.follow, name="follow_user"),
    path("post", views.generate_post, name="post"),
    path("get-username", views.get_username, name="get_username"),
    path("get-posts/<str:which_posts>/<str:username>/<int:page_number>", views.get_posts, name="get_posts_with_username_and_page"),
    path("get-posts/<str:which_posts>/<int:page_number>", views.get_posts, name="get_posts_with_page"),
    path("get-posts/<str:which_posts>/<str:username>", views.get_posts, name="get_posts_with_username"),
    path("get-posts/<str:which_posts>", views.get_posts, name="get_posts_default"),
    path("get-posts", views.get_posts, name="get_posts"),
    path("get-profile-info/<str:username>", views.get_profile_info, name="get_profile_info"),
    path("following", views.index, name="following"),
    path("profile/<str:username>", views.index, name="profile"),
]
