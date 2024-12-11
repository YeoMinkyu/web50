from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    def __str__(self) -> str:
        return self.username


class Post(models.Model):
    poster = models.ForeignKey(User, on_delete=models.CASCADE, related_name="post")
    contents = models.TextField(max_length=280)
    date_created = models.DateTimeField(auto_now_add=True)

    def serialize(self):
        return {
            "id": self.id,
            "poster": self.poster.username,
            "contents": self.contents,
            "timestamp": self.date_created.strftime("%B %d, %Y, %I:%M %p"),
        }


class Likes(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="like")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="like")


class Comments(models.Model):
    writer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comment")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comment")
    contents = models.TextField(max_length=280)
    date_created = models.DateTimeField(auto_now_add=True)


class Following(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="follower")
    following_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following")