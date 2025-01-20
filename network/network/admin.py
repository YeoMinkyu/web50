from django.contrib import admin
from .models import *

# Register your models here.
'''
class Post(models.Model):
...

class Likes(models.Model):
...

class Comments(models.Model):
...

class Following(models.Model):
...
'''
admin.site.register(Post)
admin.site.register(Likes)
# admin.site.register(Comments)
admin.site.register(Following)