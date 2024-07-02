from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from .models import Movie, MoviesList, FilePath
import deepl

URL_TMDB = 'https://api.themoviedb.org/3/'
URL_YTS = 'https://en.yts-official.mx/movies/'

API_KEY_TMDB = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MTA2MjRmYjZmOGNkMGEzMjc5YTk4ZmJhZDBkYTA4ZCIsIm5iZiI6MTcxOTYxNTIyNi42MTcyMzksInN1YiI6IjYyMTNhNzJkODEzODMxMDAxYzYxN2Q2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.KHP_u0H2ra2mASaXmyeiEX-qQiyCfhCK_HSeNbDvyn8'
API_KEY_DEEPL = '54f88a40-a6c4-4a68-bdee-460f77863eb4:fx'


def home(request):
    movies = Movie.objects.all()
    movies_list = MoviesList.objects.first().movies.all().order_by('-id')

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

def get_images_and_links(request):
    movie = Movie.objects.get(pk=request.GET.get('movie_id'))
    url = f'{URL_TMDB}movie/{movie.movie_id}/images'
    headers = {
        'accept': 'application/json',
        "Authorization": "Bearer " + API_KEY_TMDB,
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        all_file_paths = []
        for key in ['backdrops']:
            images = data.get(key, [])
            file_paths = [image['file_path'] for image in images]
            all_file_paths.extend(file_paths)

        for file_path in all_file_paths:
            FilePath.objects.create(movie=movie, file_path=file_path)

        if movie.overview:
            translator = deepl.Translator(API_KEY_DEEPL)
            synopsis_translate = translator.translate_text(movie.overview, target_lang="FR")

        title_dash = movie.title.replace(' ', '-')
        year_date = movie.release_date.year
        yts = URL_YTS + title_dash + '-' + str(year_date)

        if movie.budget and int(movie.budget) > 0:
            budget = int(movie.budget)
            budget_parsed = str(f"{budget:,}".replace(",", "."))
            movie.budget = budget_parsed


        movie.overview = synopsis_translate
        movie.url_yts = yts
        movie.save()
        return JsonResponse({'file_paths': all_file_paths})
        # return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from TMDb API: {e}")


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

            movie = Movie(
                movie_id=movie_detailed.get('id'),
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
            movies_list.movies.add(movie)
            return JsonResponse({'movie_id': movie.id})

        return JsonResponse({'error': 'Requête invalide'}, status=400)


@csrf_exempt
def delete_movie(request):
    if request.method == 'POST':
        movie_to_delete = Movie.objects.get(pk=request.POST.get('id'))
        movie_to_delete.delete()
        return redirect(reverse('home'))
    return render(request, 'home.html')