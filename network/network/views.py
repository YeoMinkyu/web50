import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.core.paginator import Paginator
from django.db import IntegrityError
from django.db.models import QuerySet
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import User, Post, Follow, Likes


def index(request):
    return render(request, "network/index.html")


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
    

@login_required(login_url="login")
def follow(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)
    
    data = json.loads(request.body)

    selected_username = data.get("selectedUser", "")
    print(f"[Debug/views.py/follow] selectedUsername ${selected_username}")
    selected_user = User.objects.get(username=selected_username)

    logged_in_username = request.user.get_username()
    logged_in_user = User.objects.get(username=logged_in_username)

    is_followed = Follow.objects.filter(follower=logged_in_user, followed_user=selected_user).exists()

    if is_followed:
        Follow.objects.filter(follower=logged_in_user, followed_user=selected_user).delete()
        return JsonResponse({"messge": f"${logged_in_username} unfollows ${selected_username}."})
    else:
        new_follow = Follow(follower=logged_in_user, followed_user=selected_user)
        new_follow.save()
        return JsonResponse({"messge": f"${logged_in_username} follows ${selected_username}."})


@login_required(login_url="login")
@require_POST
def generate_post(request):
    """
    Handle POST requests to create a new Post instance tied to the authenticated user.
    Returns JSON response with success message or error details.
    """
    try:
        data = json.loads(request.body)

        content = data.get("content", "").strip()

        if not content:
            return JsonResponse({"error": "Content is required."}, status=400)

        # Use request.user directly(no need to fetch username and query again)
        user = request.user

        # Create and save the post using create() for efficiency
        new_post = Post.objects.create(poster=user, contents=content)

        return JsonResponse({"message": "New post created successfully.",
                             "post": {
                                 "id": new_post.id,
                                 "content": new_post.contents,
                                 "poster": user.username,
                                 "create_at": new_post.created_at.isoformat()
                             }
                             }, status=201)
    
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404)
    except KeyError:
        # In case 'content' key is not in JSON
        return JsonResponse({"error": "Missing content key."}, status=400)
    except Exception as e:
        # Catch any other exceptions which could be thrown by the database or Python runtime
        return JsonResponse({"error": str(e)}, status=500)


def get_posts(request, which_posts="all", username="", page_number=1):
    """
    Handle GET request to retrieve paginated posts based on type and user criteria
    Args:
        request: HTTP request object
        which_post: Type of posts to fetch('all', 'following', 'profile')
        username: Target username of profile posts(Optional)
        page_number: Page number for pagination(default: 1) 
    Returns:
        JsonResponse with posts and pagination metadata or error message
    """

    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed. Use GET!"}, status=405)

    try:
        print("[Debug/views.py/get_posts] which_posts: ", which_posts)
        print("[Debug/views.py/get_posts] Received page_number:", page_number)
        print("[Debug/views.py/get_posts] Request path:", request.path)

        page_number = max(int(page_number), 1)

        posts = _get_filitered_posts(request.user, which_posts, username)

        # print(f"[Debug/views.py/get_posts] posts: {posts}")

        paginator = Paginator(posts, 10)
        page_obj = paginator.get_page(page_number)
        # print(f"[Debug/views.py/get_posts] page_obj: {page_obj}")
        
        response_data = {
            "posts": [post.serialize() for post in page_obj],
            "pagination": _build_pagination_metadata(page_obj),
        }

        # print(f"[Debug/views.py/get_posts] Total pages: {paginator.num_pages}")
        # print(f"[Debug/views.py/get_posts] Posts in page {page_number}: {[post.serialize() for post in page_obj]}")
        # print(f"[Debug/views.py/get_posts] response_data pagination: {response_data.get('pagination')}")

        return JsonResponse(response_data, safe=False, status=200)
    
    except ValueError:
        return JsonResponse({"error": "Invalid page number"}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"An expected error occurred {str(e)}"}, status=500)
    
def _get_filitered_posts(user, which_posts:str, username:str) -> QuerySet | None:
    # print(f"[Debug/views.py/get_posts] User: {user} Posts: {which_posts} Username: {username}")

    if which_posts == "all":
        # print(f"[Debug/views.py/get_posts] all Posts: {which_posts}")
        return Post.objects.order_by("-date_created")
    elif which_posts == "following":
        # print(f"[Debug/views.py/get_posts] following Posts: {which_posts}")
        # print(f"[Debug/views.py/get_posts] user.followers.all(): {user.followers.all()}")
        # print(f"[Debug/views.py/get_posts] user.followed.all(): {user.followed.all()}")
        # following_ids = [follow_connection.followed_user.id for follow_connection in user.followers.all()]
        following_ids = user.followers.values_list("followed_user__id", flat=True)
        # print("[Debug/views.py/get_posts] following_users: ", existing_following_ids)
        # print("[Debug/views.py/get_posts] following_users: ", following_ids)
        
        return Post.objects.filter(poster__id__in=following_ids).order_by("-date_created")
        # print("[Debug/views.py/get_posts] Filtered posts count:", posts.count())

    elif which_posts == "profile" and username:
        # print(f"[Debug/views.py/get_posts] profile Posts: {which_posts}")
        return Post.objects.filter(poster__username=username).order_by("-date_created")
    
    return None

def _build_pagination_metadata(page_obj) -> dict:
    """
    Build pagination metadata from a Paginator page object.
    """

    pagination_metadata = {
                "has_previous": page_obj.has_previous(),
                "previous_page_number": page_obj.previous_page_number() if page_obj.has_previous() else None,
                "page_number": page_obj.number,
                "whole_pages_number": page_obj.paginator.num_pages,
                "has_next": page_obj.has_next(),
                "next_page_number": page_obj.next_page_number() if page_obj.has_next() else None,
                }
    
    return pagination_metadata 
    

def get_profile_info(request, username):
    if request.method == "GET":
        user = request.user

        try:
            profile_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found!"}, status=404)
        else:
            follower_no = profile_user.followed.count()
            followed_no = profile_user.followers.count()
            is_follower = Follow.objects.filter(follower=user, followed_user=profile_user).exists()

            # print(f"[Debug/views.py/get_profile_info] is_follower: {is_follower}")

            print(f"[Debug] follower: {follower_no} / followed: {followed_no}")

            return JsonResponse({"follower_no": follower_no,
                                "following_no": followed_no,
                                "is_follower": is_follower,
                                }, status=200)


    return JsonResponse({"error": "Invalid Request!"}, status=400)


# @login_required(login_url="login")
def get_username(request):
    user_name = request.user.get_username()

    return JsonResponse({'username': user_name}, status=200)


@login_required(login_url="login")
def like_post(request, post_id):
    user = request.user

    if request.method == "GET":
        post = get_object_or_404(Post, id=post_id)

        liked = Likes.objects.filter(post=post, user=user).exists()
        likes_count = post.like.count()

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
