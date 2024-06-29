from django.shortcuts import render
from django.http import JsonResponse
import requests
from django.views.decorators.csrf import csrf_exempt
from .models import Movie


API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MTA2MjRmYjZmOGNkMGEzMjc5YTk4ZmJhZDBkYTA4ZCIsIm5iZiI6MTcxOTYxNTIyNi42MTcyMzksInN1YiI6IjYyMTNhNzJkODEzODMxMDAxYzYxN2Q2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.KHP_u0H2ra2mASaXmyeiEX-qQiyCfhCK_HSeNbDvyn8'
URL = 'https://api.themoviedb.org/3/'

def home(request):
    movies = [
        {'title': 'Inception', 'year': 2010},
        {'title': 'The Matrix', 'year': 1999},
        {'title': 'Interstellar', 'year': 2014},
    ]
    values = {
        'movies': movies,
    }
    return render(request, 'home.html', values)


def search_movies(request):
    print('ici => ', request)
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
                results = data.get('results', [])
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
        print(movie_detailed)
        if movie_detailed:
            movie = Movie(
                title=movie_detailed.get('title'),
                poster_path=movie_detailed.get('poster_path'),
                release_date=movie_detailed.get('release_date'),
                genre_ids=movie_detailed.get('genres'),
                overview=movie_detailed.get('overview'),
                budget=movie_detailed.get('budget'),
                origin_country=movie_detailed.get('origin_country'),
                production_companies=movie_detailed.get('production_companies'),
                status=movie_detailed.get('status'),
            )
            movie.save()
            return JsonResponse({'message': 'Film ajouté avec succès'})

        return JsonResponse({'error': 'Requête invalide'}, status=400)