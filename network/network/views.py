import json
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from .models import User, Post, Following
from .forms import PostForm


def index(request):
    return render(request, "network/index.html")


@csrf_exempt
@login_required(login_url="login")
def follow(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)
    
    data = json.loads(request.body)

    following_username = data.get("followingUser", "")
    # print(f"[Debug/views.py/follow] ${following_username}")
    following_user = User.objects.get(username=following_username)

    logged_in_username = request.user.get_username()
    logged_in_user = User.objects.get(username=logged_in_username)

    is_following = Following.objects.filter(follower=logged_in_user, following_user=following_user).exists()

    if is_following:
        Following.objects.filter(follower=logged_in_user, following_user=following_user).delete()
        return JsonResponse({"messge": f"${logged_in_username} unfollows ${following_username}."})
    else:
        new_following = Following(follower=logged_in_user, following_user=following_user)
        new_following.save()
        return JsonResponse({"messge": f"${logged_in_username} follows ${following_username}."})


@csrf_exempt
@login_required(login_url="login")
def generate_post(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)
    
    data = json.loads(request.body)

    content = data.get("content", "")

    username = request.user.get_username()
    user = User.objects.get(username=username)

    new_post = Post(poster=user, contents=content)
    new_post.save()

    return JsonResponse({"message": "New post created successfully."}, status=201)


def get_posts(request, which_posts="all", username=""):
    if request.method == "GET":
        if which_posts == "profile":
            if username:
                user = User.objects.get(username=username)
                posts = Post.objects.filter(poster=user).order_by("-date_created").all()
                preprocessed_posts = [post.serialize() for post in posts]
                # print("[Debug/views.py/get_posts]: ", preprocessed_posts)
        elif which_posts == "following":
            logged_in_username = request.user.get_username()
            logged_in_user = User.objects.get(username=logged_in_username)

            
            try:
                following_relationships = Following.objects.filter(follower=logged_in_user)
            except TypeError:
                return JsonResponse({"error": "Invalid Request!"}, status=400)
            else:
                following_users = following_relationships.values_list('following_user', flat=True)
                # print("[Debug/views.py/get_posts] following_users: ", following_users)
                '''
                for following_user in following_users:
                    print("[Debug/views.py/get_posts] following_user: ", following_user)
                '''
                posts = Post.objects.filter(poster__in=following_users).order_by("-date_created")
                preprocessed_posts = [post.serialize() for post in posts]
                # print("[Debug/views.py/get_posts] Following post: ", preprocessed_posts)
        else:
            posts = Post.objects.all()
            posts = posts.order_by("-date_created").all() # Post objects
            preprocessed_posts = [post.serialize() for post in posts]
            # print("[Debug/views.py/get_posts]: ", preprocessed_posts)

        return JsonResponse(preprocessed_posts, safe=False)
    
    return JsonResponse({"error": "Invalid Request!"}, status=400)


def get_profile_info(request, username):
    if request.method == "GET":
        logged_in_username = request.user.get_username()

        logged_in_user = User.objects.get(username=logged_in_username)
        profile_user = User.objects.get(username=username)
        
        follower_no = profile_user.following.count()
        following_no = profile_user.follower.count()
        is_follower = Following.objects.filter(follower=logged_in_user, following_user=profile_user).exists()

        # print(f"[Debug/views.py/get_profile_info] is_follower: {is_follower}")

        # print(f"[Debug] follower: {follower_no} / following: {following_no}")

        return JsonResponse({"follower_no": follower_no,
                             "following_no": following_no,
                             "is_follower": is_follower,
                             })


    return JsonResponse({"error: Invalid Request!"}, status=400)


# @login_required(login_url="login")
def get_username(request):
    user_name = request.user.get_username()

    return JsonResponse({'username': user_name}, status=200)


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
    