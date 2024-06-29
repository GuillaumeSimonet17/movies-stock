from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from .models import Movie

API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MTA2MjRmYjZmOGNkMGEzMjc5YTk4ZmJhZDBkYTA4ZCIsIm5iZiI6MTcxOTYxNTIyNi42MTcyMzksInN1YiI6IjYyMTNhNzJkODEzODMxMDAxYzYxN2Q2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.KHP_u0H2ra2mASaXmyeiEX-qQiyCfhCK_HSeNbDvyn8'
URL = 'https://api.themoviedb.org/3/'


def home(request):
    movies = Movie.objects.all()
    context = { 'movies': movies }
    return render(request, 'home.html', context)


def search_movies(request):
    if request.method == 'GET' and 'query' in request.GET:
        query = request.GET.get('query')
        if query:
            url = f'{URL}search/movie?query={query}'
            headers = {
                'accept': 'application/json',
                "Authorization": "Bearer " + API_KEY,
            }
            try:
                response = requests.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                return JsonResponse(data)

            except requests.exceptions.RequestException as e:
                print(f"Error fetching data from TMDb API: {e}")
    return JsonResponse()


def search_detailed_movies(movie_id):
    url = f'{URL}movie/{movie_id}'
    headers = {
        'accept': 'application/json',
        "Authorization": "Bearer " + API_KEY,
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from TMDb API: {e}")


@csrf_exempt
def add_movie(request):
    if request.method == 'POST':
        movie_id = request.POST.get('id')
        movie_detailed = search_detailed_movies(movie_id)
        if movie_detailed:
            movie = Movie(
                title=movie_detailed.get('title'),
                poster_path=movie_detailed.get('poster_path'),
                release_date=movie_detailed.get('release_date') or None,
                genre_ids=movie_detailed.get('genres') or None,
                overview=movie_detailed.get('overview') or None,
                budget=movie_detailed.get('budget') or None,
                origin_country=movie_detailed.get('origin_country') or None,
                production_companies=movie_detailed.get('production_companies') or None,
                status=movie_detailed.get('status'),
            )
            movie.save()
            return JsonResponse({'message': 'Film ajouté avec succès'})

        return JsonResponse({'error': 'Requête invalide'}, status=400)


@csrf_exempt
def delete_movie(request):
    if request.method == 'POST':
        movie_to_delete = Movie.objects.get(pk=request.POST.get('id'))
        movie_to_delete.delete()
        return redirect(reverse('home'))
    return render(request, 'home.html')