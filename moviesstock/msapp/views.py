from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from .models import Movie, MoviesList
import deepl

URL_TMDB = 'https://api.themoviedb.org/3/'
URL_YTS = 'https://en.yts-official.mx/movies/'

API_KEY_TMDB = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MTA2MjRmYjZmOGNkMGEzMjc5YTk4ZmJhZDBkYTA4ZCIsIm5iZiI6MTcxOTYxNTIyNi42MTcyMzksInN1YiI6IjYyMTNhNzJkODEzODMxMDAxYzYxN2Q2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.KHP_u0H2ra2mASaXmyeiEX-qQiyCfhCK_HSeNbDvyn8'
API_KEY_DEEPL = '54f88a40-a6c4-4a68-bdee-460f77863eb4:fx'


def home(request):
    movies = Movie.objects.all()
    movies_list = MoviesList.objects.first()

    context = {
        'movies': movies,
        'movies_list': movies_list,
    }
    return render(request, 'home.html', context)


def search_movies(request):
    if request.method == 'GET' and 'query' in request.GET:
        query = request.GET.get('query')
        if query:
            url = f'{URL_TMDB}search/movie?query={query}'
            headers = {
                'accept': 'application/json',
                "Authorization": "Bearer " + API_KEY_TMDB,
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
    url = f'{URL_TMDB}movie/{movie_id}'
    headers = {
        'accept': 'application/json',
        "Authorization": "Bearer " + API_KEY_TMDB,
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
            movies_list, created = MoviesList.objects.get_or_create(name='Main List')

            synopsis = movie_detailed.get('overview')
            if synopsis:
                translator = deepl.Translator(API_KEY_DEEPL)
                synopsis_translate = translator.translate_text(synopsis, target_lang="FR")

            title = movie_detailed.get('title')
            title_dash = title.replace(' ', '-')
            date = movie_detailed.get('release_date')
            year_date = date[:4]
            yts = URL_YTS + title_dash + '-' + year_date

            budget = int(movie_detailed.get('budget'))
            budget_parsed = str(f"{budget:,}".replace(",", "."))

            movie = Movie(
                title=movie_detailed.get('title'),
                poster_path=movie_detailed.get('poster_path'),
                release_date=movie_detailed.get('release_date') or None,
                genre_ids=movie_detailed.get('genres') or None,
                overview=synopsis_translate or None,
                budget=budget_parsed or None,
                origin_country=movie_detailed.get('origin_country') or None,
                production_companies=movie_detailed.get('production_companies') or None,
                status=movie_detailed.get('status'),
                url_yts=yts
            )
            movie.save()
            movies_list.movies.add(movie)
            return JsonResponse({'message': 'Film ajouté avec succès'})

        return JsonResponse({'error': 'Requête invalide'}, status=400)


@csrf_exempt
def delete_movie(request):
    if request.method == 'POST':
        movie_to_delete = Movie.objects.get(pk=request.POST.get('id'))
        movie_to_delete.delete()
        return redirect(reverse('home'))
    return render(request, 'home.html')