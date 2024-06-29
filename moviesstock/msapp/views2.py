from django.core.serializers import serialize
from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render, reverse
from .models import Movie, MoviesList


def movie_page(request):
    if request.method == 'GET' and 'query' in request.GET:
        movie = Movie.objects.get(pk=request.GET.get('query'))
        movies_list = MoviesList.objects.first()
        movie_ids = list(movies_list.movies.values_list('id', flat=True))

        context = {
            'movie': movie,
            'movies_list': movie_ids
        }
        return render(request, 'movie_page_template.html', context)


def next_movie(request):
    print('okok')
#     if request.method == 'GET' and 'query' in request.GET:
#         m = Movie.objects.get(pk=request.GET.get('movie.id'))
#         return render(request, 'movie_page_template.html')

    #
    #     movie_to_delete = Movie.objects.get(pk=request.POST.get('id'))
    #     movie_to_delete.delete()
    #     return redirect(reverse('home'))
    # return render(request, 'home.html')