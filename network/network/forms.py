from django.forms import ModelForm, Textarea
from .models import Post

class PostForm(ModelForm):
    '''
    poster = models.ForeignKey(User, on_delete=models.CASCADE, related_name="post")
    contents = models.TextField(max_length=280)
    date_created = models.DateTimeField(auto_now_add=True)
    '''
    class Meta:
        model = Post
        fields = ["contents"]
        error_messages = {
            "contents": {
                "max_length": "This comments is too long.",
            }
        }
        widgets = {
            "contents": Textarea(attrs={
                "cols": 70,
                "rows": 4,
                "class": "form-control"
                }),
        }