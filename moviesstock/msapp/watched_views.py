from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from .models import WatchedMovie

@login_required
def watched_list(request):
    watched_movies = WatchedMovie.objects.filter(user=request.user).select_related('movie').order_by('-watched_at')

    return render(request, "watched_list_template.html", {
        "watched_movies": watched_movies
    })
