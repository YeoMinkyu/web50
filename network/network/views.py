import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import IntegrityError
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from .models import User, Post, Following, Likes


def index(request):
    return render(request, "network/index.html")


@csrf_exempt
@login_required(login_url="login")
def edit_post(request, post_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)
    
    data = json.loads(request.body)
    content = data.get("content", "")

    edit_post = Post.objects.get(id=post_id)
    edit_post.contents = content
    edit_post.save()

    # print(f"[Debug/views.py/edit_post] edit_post: {edit_post}")
    # print(f"[Debug/views.py/edit_post] date: {edit_post.date_created}")

    return JsonResponse({"message": "New post is edited successfully."}, status=201)
    

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


def get_posts(request, which_posts="all", username="", page_number=1):
    user = request.user
    print("[Debug/views.py/get_posts] which_posts: ", which_posts)
    print("[Debug/views.py/get_posts] Received page_number:", page_number)
    print("[Debug/views.py/get_posts] Request path:", request.path)

    if which_posts == "all":
        posts = Post.objects.all().order_by("-date_created").all()
    elif which_posts == "following":    
        following_users = [follow_connection.following_user.id for follow_connection in user.follower.all()]
        # print("[Debug/views.py/get_posts] following_users: ", following_users)
        
        posts = Post.objects.filter(poster__in=following_users).order_by("-date_created")
        # print("[Debug/views.py/get_posts] Filtered posts count:", posts.count())

    elif which_posts == "profile" and username:
        posts = Post.objects.filter(poster__username=username).order_by("-date_created")
    else:
        return JsonResponse({"error": "Invalid Request!"}, status=400)

    paginator = Paginator(posts, 10)
    page_obj = paginator.get_page(page_number)
    # print(f"[Debug/views.py/get_posts] page_obj: {page_obj}")

    pagination_metadata = {
                "has_previous": page_obj.has_previous(),
                "previous_page_number": page_obj.previous_page_number() if page_obj.has_previous() else None,
                "page_number": page_obj.number,
                "whole_pages_number": page_obj.paginator.num_pages,
                "has_next": page_obj.has_next(),
                "next_page_number": page_obj.next_page_number() if page_obj.has_next() else None,
                }
    
    response_data = {
        "posts": [post.serialize() for post in page_obj],
        "pagination": pagination_metadata,
    }

    # print(f"[Debug/views.py/get_posts] Total pages: {paginator.num_pages}")
    # print(f"[Debug/views.py/get_posts] Posts in page {page_number}: {[post.serialize() for post in page_obj]}")
    # print(f"[Debug/views.py/get_posts] response_data pagination: {response_data.get('pagination')}")

    return JsonResponse(response_data, safe=False)
    

def get_profile_info(request, username):
    if request.method == "GET":
        user = request.user

        try:
            profile_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found!"}, status=404)
        else:
            follower_no = profile_user.following.count()
            following_no = profile_user.follower.count()
            is_follower = Following.objects.filter(follower=user, following_user=profile_user).exists()

            # print(f"[Debug/views.py/get_profile_info] is_follower: {is_follower}")

            # print(f"[Debug] follower: {follower_no} / following: {following_no}")

            return JsonResponse({"follower_no": follower_no,
                                "following_no": following_no,
                                "is_follower": is_follower,
                                }, status=200)


    return JsonResponse({"error": "Invalid Request!"}, status=400)


# @login_required(login_url="login")
def get_username(request):
    user_name = request.user.get_username()

    return JsonResponse({'username': user_name}, status=200)


@csrf_exempt
@login_required(login_url="login")
def like_post(request, post_id):
    user = request.user


    if request.method == "GET":
        # gathering data for the whole likes of this post
        # and whether the logged-in user like the current post
        post = get_object_or_404(Post, id=post_id)

        liked = Likes.objects.filter(post=post, user=user).exists()
        likes_count = post.like.count()

        # print(f"[Debug] likes: {likes}")

        return JsonResponse({'liked': liked,
                            'likes': likes_count,
                            }, status=200)
    
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            liked = data.get("liked", None)

            if liked is None:
                return JsonResponse({"error": "Missing 'liked' filed"}, status=400)
            
            post = get_object_or_404(Post, id=post_id)

            if liked:
                Likes.objects.get_or_create(user=user, post=post)
                message = "Like added successfully."
            else:
                Likes.objects.filter(user=user, post=post).delete()
                message = "Like removed successfully."
            
            return JsonResponse({"message": message}, status=201)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data!"}, status=400)
        
    return JsonResponse({"error":"Invalid reqeust method!"}, status=405)


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
    