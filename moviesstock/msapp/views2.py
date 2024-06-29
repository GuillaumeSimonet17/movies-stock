from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render, reverse
from .models import Movie


def movie_page(request):
    print('ahbon=>', request)
    if request.method == 'GET' and 'query' in request.GET:
        movie = Movie.objects.get(pk=request.GET.get('query'))
        context = { 'movie': movie }
        return render(request, 'movie_page_template.html', context)
