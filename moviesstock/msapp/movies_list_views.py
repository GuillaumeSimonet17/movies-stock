from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .models import Movie, MoviesList, FilePath, WatchedMovie
import deepl
import os
from dotenv import load_dotenv

from .utils import get_dominant_color, search_detailed_movies

load_dotenv()

API_KEY_TMDB = os.getenv('API_KEY_TMDB')
API_KEY_DEEPL = os.getenv('API_KEY_DEEPL')

URL_TMDB = 'https://api.themoviedb.org/3/'

GENRES = [
    'All',
    'Action',
    'Adventure',
    'Action & Adventure',
    'Animation',
    'Biography',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'Sci-Fi & Fantasy',
    'Film Noir',
    'Game Show',
    'History',
    'Horror',
    'Musical',
    'Music',
    'Mystery',
    'Romance',
    'Science Fiction',
    'Short',
    'Sport',
    'Thriller',
    'War',
    'Western',
    'No genre',
]
ORDERS = [
    'Year Asc',
    'Year Dsc',
    'Date added',
]

@login_required
def home(request):
    movies_list, created = MoviesList.objects.get_or_create(
        user=request.user,
        defaults={'name': request.user.username + '\'s list'}
    )

    genre_selected = request.GET.get('gnr', 'All')
    ordered_selected_value = request.GET.get('ord', 'Date added')
    tv_or_movie_selected = request.GET.get('tv_or_movie', 'All')

    # ================= BASE QUERYSET =================
    base_queryset = movies_list.movies.all()

    # ----- Genre filter -----
    if genre_selected != 'All' and genre_selected != 'No genre':
        base_queryset = base_queryset.filter(
            genre_ids__contains=[{'name': genre_selected}]
        )
    elif genre_selected == 'No genre':
        base_queryset = base_queryset.filter(genre_ids=[])

    # ----- TV / Movie filter -----
    if tv_or_movie_selected != 'All':
        base_queryset = base_queryset.filter(
            is_tv=(tv_or_movie_selected == 'Series')
        )

    # ================= ORDER =================
    order = '-id'  # Date added
    if ordered_selected_value == 'Year Asc':
        order = 'release_date'
    elif ordered_selected_value == 'Year Dsc':
        order = '-release_date'

    # ================= LATEST (10 derniers ajoutés) =================
    latest_ids = list(
        base_queryset
        .order_by('-id')
        .values_list('id', flat=True)[:10]
    )

    latest_movies = (
        base_queryset
        .filter(id__in=latest_ids)
        .order_by(order)
    )

    # ================= MAIN LIST =================
    movies_in_list = base_queryset.order_by(order)

    # ================= GROUP BY GENRE =================
    movies_by_genre = {}

    if latest_movies:
        movies_by_genre['Latest'] = latest_movies

    for genre in GENRES:
        if genre == 'All':
            continue

        if genre == 'No genre':
            genre_movies = [
                movie for movie in movies_in_list
                if not movie.genre_ids
            ]
        else:
            genre_movies = [
                movie for movie in movies_in_list
                if isinstance(movie.genre_ids, list)
                and any(g.get('name') == genre for g in movie.genre_ids)
            ]

        if genre_movies:
            movies_by_genre[genre] = genre_movies

    context = {
        'movies_by_genre': movies_by_genre,
        'genres': GENRES,
        'orders': ORDERS,
        'genre_selected': genre_selected,
        'tv_or_movie_selected': tv_or_movie_selected,
        'ordered_selected_value': ordered_selected_value,
    }

    return render(request, 'home.html', context)

@login_required
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
    return JsonResponse({"results": []})

@login_required
def search_tv(request):
    query = request.GET.get('query')
    if not query:
        return JsonResponse({"results": []})

    url = f'{URL_TMDB}search/tv?query={query}'
    headers = {
        'accept': 'application/json',
        "Authorization": "Bearer " + API_KEY_TMDB,
    }

    response = requests.get(url, headers=headers)
    return JsonResponse(response.json())

@login_required
def get_images_and_links(request):
    movie = Movie.objects.get(pk=request.GET.get('movie_id'))
    type = request.GET.get('type')
    if type == 'tv':
        url = f'{URL_TMDB}tv/{movie.movie_id}/images'
    else:
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

        synopsis_translate = None
        if movie.overview:
            translator = deepl.Translator(API_KEY_DEEPL)
            synopsis_translate = translator.translate_text(movie.overview, target_lang="FR")

        if movie.budget and int(movie.budget) > 0:
            budget = int(movie.budget) // 1_000_000
            budget_parsed = str(budget) + 'M'
            movie.budget = budget_parsed

        movie.overview = synopsis_translate
        movie.save()

        return JsonResponse({'file_paths': all_file_paths})
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from TMDb API: {e}")

@csrf_exempt
def add_movie(request):
    if request.method == 'POST':
        movie_id = request.POST.get('id')
        movies_list = MoviesList.objects.get(user=request.user)

        if not movie_id:
            return JsonResponse({'error': 'movie_id missing'}, status=400)

        if movies_list.movies.filter(movie_id=movie_id).exists():
            return JsonResponse(
                {'error': 'Ce film est déjà dans ta liste'},
                status=409
            )

        existing_movie = Movie.objects.filter(movie_id=movie_id).first()
        if existing_movie:
            movies_list.movies.add(existing_movie)
            return JsonResponse({'movie_id': existing_movie.id})

        type = request.POST.get('type')
        if type == 'tv':
            movie_detailed = search_detailed_movies(f'{URL_TMDB}tv/{movie_id}')
            actors_directors = search_detailed_movies(f'{URL_TMDB}tv/{movie_id}/credits')
        else:
            movie_detailed = search_detailed_movies(f'{URL_TMDB}movie/{movie_id}')
            actors_directors = search_detailed_movies(f'{URL_TMDB}movie/{movie_id}/credits')
        actors = [actor['name'] for actor in actors_directors['cast'][:5]]
        directors = [crew['name'] for crew in actors_directors['crew'] if crew['job'] == 'Director']
        actors_combined = ', '.join(actors)
        directors_combined = ', '.join(directors)

        if movie_detailed:

            image_path = 'https://image.tmdb.org/t/p/w500' + movie_detailed.get('poster_path')
            dominant_color = get_dominant_color(image_path)

            movie = Movie(
                movie_id=movie_detailed.get('id'),
                title=movie_detailed.get('name') if type == 'tv' else movie_detailed.get('title'),
                poster_path=movie_detailed.get('poster_path'),
                release_date=movie_detailed.get('release_date') or None,
                genre_ids=movie_detailed.get('genres') or [],
                overview=movie_detailed.get('overview') or None,
                actors=actors_combined,
                directors=directors_combined,
                budget=movie_detailed.get('budget') or None,
                origin_country=movie_detailed.get('origin_country') or None,
                production_companies=movie_detailed.get('production_companies') or None,
                status=movie_detailed.get('status'),
                dominant_color=dominant_color,
                is_tv=True if type == 'tv' else False,
            )
            movie.save()
            movies_list.movies.add(movie)

            return JsonResponse({'movie_id': movie.id})

        return JsonResponse({'error': 'Requête invalide'}, status=400)

@csrf_exempt
def add_to_watched_list(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    movie_id = request.POST.get("id")

    if not movie_id:
        return JsonResponse({"error": "movie_id is required"}, status=400)

    try:
        movie = Movie.objects.get(id=movie_id)
    except Movie.DoesNotExist:
        return JsonResponse({"error": "Movie not found"}, status=404)

    watched, created = WatchedMovie.objects.get_or_create(
        user=request.user,
        movie=movie
    )

    try:
        movies_list = MoviesList.objects.get(user=request.user)
        movies_list.movies.remove(movie)
    except MoviesList.DoesNotExist:
        pass

    if created:
        return redirect('home')
    else:
        return redirect('home')

@csrf_exempt
def delete_movie(request):
    if request.method == 'POST':
        movie_id = request.POST.get('id')

        if not movie_id:
            return redirect('home')

        movie = Movie.objects.filter(pk=movie_id).first()
        if not movie:
            return redirect('home')

        try:
            movies_list = MoviesList.objects.get(user=request.user)
            movies_list.movies.remove(movie)
            if (
                    not movie.movies_lists.exists()
                    and not movie.watched_by.exists()
            ):
                movie.delete()

        except MoviesList.DoesNotExist:
            pass

        return redirect('home')

    return redirect('home')

@login_required
def random_movie(request):
    movies = MoviesList.objects.get(user=request.user).movies.all()

    if not movies.exists():
        return redirect('/')

    movie = movies.order_by('?').first()
    return redirect(f'/movie_page/?query={movie.id}&random=1')