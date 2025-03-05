from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    def __str__(self) -> str:
        return self.username


class Post(models.Model):
    poster = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    contents = models.TextField(max_length=280)
    date_created = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.poster.username} - {self.contents[:20]}"

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


class Follow(models.Model):
    followed_user = models.ForeignKey(User, null=True, on_delete=models.CASCADE, related_name="followed")
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers")