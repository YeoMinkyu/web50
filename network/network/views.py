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
def generate_post(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)
    
    data = json.loads(request.body)

    content = data.get("content", "")

    username = request.user.get_username()
    user = User.objects.get(username=username)

    new_post = Post(poster=user, contents=content)
    new_post.save()

    preproceesed_post = new_post.serialize()

    return JsonResponse({"message": "New post created successfully."}, status=201)


def get_posts(request, username=""):
    if request.method == "GET":
        if username:
            user = User.objects.get(username=username)
            posts = Post.objects.filter(poster=user)
            posts = posts.order_by("-date_created").all()
            preprocessed_posts = [post.serialize() for post in posts]
            # print("[Debug]: ", preprocessed_posts)
        else:
            posts = Post.objects.all()
            posts = posts.order_by("-date_created").all() # Post objects
            preprocessed_posts = [post.serialize() for post in posts]
            # print("[Debug]: ", preprocessed_posts)

        return JsonResponse(preprocessed_posts, safe=False)
    
    return JsonResponse({"error": "Invalid Request!"}, status=400)


def get_profile_info(request, username):
    if request.method == "GET":
        current_username = request.user.get_username()

        current_user = User.objects.get(username=current_username)
        user = User.objects.get(username=username)
        
        follower_no = user.follower.count()
        following_no = user.following.count()
        is_follower = Following.objects.filter(follower=current_user).exists()

        print(f"[Debug] is_follower: {is_follower}")

        # print(f"[Debug] follower: {follower_no} / following: {following_no}")

        return JsonResponse({"follower_no": follower_no,
                             "following_no": following_no,
                             "is_follwer": is_follower,
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
    