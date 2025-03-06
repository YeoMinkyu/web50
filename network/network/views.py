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
from django.views.decorators.http import require_POST, require_GET, require_http_methods

from .models import User, Post, Follow, Likes


def index(request):
    return render(request, "network/index.html")


@login_required(login_url="login")
@require_POST
def edit_post(request, post_id:int) -> JsonResponse:
    """
    Handle POST request to edit an existing post's content.
    Args:
        request: HTTP request object.
        post_id: ID of the post to edit.
    Returns:
        JsonResponse with success message or errors details.
    """
    try:
        data = json.loads(request.body)
        content = data["content"].strip()

        if not content:
            return JsonResponse({"error": "Content cannot be empty!"}, status=400)

        edit_post = Post.objects.get(id=post_id)
        if request.user != edit_post.poster:
            return JsonResponse({"error": "You can only edit your own posts!"}, status=403)

        edit_post.contents = content
        edit_post.save(update_fields=["contents"])

        return JsonResponse({"message": "New post is edited successfully."}, status=201)
    
    except KeyError:
        return JsonResponse({"error": "Missing content key."}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid Json."}, status=400)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post does not exist."}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error occurred {str(e)}"}, status=500)


@require_POST
@login_required(login_url="login")
def follow(request) -> JsonResponse:
    """
    Handle POST request to toggle follow/unfollow relationships between users.
    Returns:
        JsonResponse with success message or error details.
    """
    
    try:
        data = json.loads(request.body)

        selected_username = data["selectedUser"].strip()

        logged_in_user = request.user

        selected_user = User.objects.get(username=selected_username)

        follow_exists = Follow.objects.filter(follower=logged_in_user, followed_user=selected_user).exists()

        if follow_exists:
            Follow.objects.filter(follower=logged_in_user, followed_user=selected_user).delete()
            message = f"{logged_in_user.username} unfollows {selected_username}"
        else:
            Follow.objects.create(follower=logged_in_user, followed_user=selected_user)
            message = f"{logged_in_user.username} follows {selected_username}"
        
        return JsonResponse({"message": message}, status=200)
    
    except KeyError:
        return JsonResponse({"error": "Missing selectedUser key."}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    except ObjectDoesNotExist:
        return JsonResponse({"error": "Target user does not exsist."}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error occurred {str(e)}."}, status=500)
    

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


@require_GET
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


@login_required(login_url="login")
@require_GET
def get_profile_info(request, username: str) -> JsonResponse:
    """
    Handle Get get request to retrieve profile info of a target user.
    Args:
        request: HTTP request object
        username : a target username to get information
    Returns:
        JsonResponse with follower/following counts and follow status, or error message
    """

    try:
        profile_user = User.objects.get(username=username)

        follower_no = profile_user.followed.count()
        following_no = profile_user.followers.count()
        is_follower = Follow.objects.filter(follower=request.user, followed_user=profile_user).exists()

        # print(f"[Debug/views.py/get_profile_info] is_follower: {is_follower}")

        # print(f"[Debug] follower: {follower_no} / followed: {followed_no}")

        response_data = {
            "follower_no": follower_no,
            "following_no": following_no,
            "is_follower": is_follower,
        }

        return JsonResponse(response_data, status=200)

    except User.DoesNotExist:
        return JsonResponse({"error": "User not found!"}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error occured: {str(e)}"}, status=500)


# @login_required(login_url="login")
def get_username(request):
    user_name = request.user.get_username()

    return JsonResponse({'username': user_name}, status=200)


@require_http_methods(['GET', 'POST'])
@login_required(login_url="login")
def like_post(request, post_id: int) -> JsonResponse:
    """
    Handle HTTP request for post likes.
    - GET: Retrieve like status and count for the post.
    - POST: Toggle like/unlike status for the post by the current user.
    Args:
        request: HTTP request object
        post_id: ID of the post to interact with
    Returns:
        JsonResponse with like data or error details.
    """

    user = request.user
    post = get_object_or_404(Post, id=post_id)


    if request.method == "GET":

        liked = Likes.objects.filter(post=post, user=user).exists()
        likes_count = post.like.count()

        return JsonResponse({'liked': liked,
                            'likes': likes_count,
                            }, status=200)
    
    try:
        data = json.loads(request.body)
        liked = data.get("liked")

        if liked is None:
            return JsonResponse({"error": "Missing 'liked' field in request body."}, status=400)
        
        if liked:
            Likes.objects.get_or_create(user=user, post=post)
            message = "Like added successfully."
        else:
            Likes.objects.filter(user=user, post=post).delete()
            message = "Like removed successfully."
        
        likes_count = post.like.count()

        return JsonResponse({"message": message,
                             "likes": likes_count},
                             status=200)
    
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data!"}, status=400)
    except Exception as e:
        return JsonResponse({"error": "Unexpected error occurred!"}, status=500)
        

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
