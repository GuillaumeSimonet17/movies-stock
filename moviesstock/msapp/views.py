from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .models import Movie, MoviesList, FilePath
import deepl
from django.db.models import Q

from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
from io import BytesIO
from collections import Counter
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Access environment variables
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

    movies_in_list = movies_list.movies.all()

    # Filtrer par genre si nécessaire
    if genre_selected != 'All' and genre_selected != 'No genre':
        movies_in_list = movies_in_list.filter(genre_ids__contains=[{'name': genre_selected}])
    if genre_selected == 'No genre':
        movies_in_list = movies_in_list.filter(genre_ids=[])

    if tv_or_movie_selected != 'All':
        if tv_or_movie_selected == 'Series':
            movies_in_list = movies_in_list.filter(is_tv=True)
        else:
            movies_in_list = movies_in_list.filter(is_tv=False)

    # Trier
    order = '-id'
    if ordered_selected_value == 'Year Asc':
        order = 'release_date'
    elif ordered_selected_value == 'Year Dsc':
        order = '-release_date'
    movies_in_list = movies_in_list.order_by(order)

    movies_by_genre = {}

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

def search_detailed_movies(url):
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
            movies_list = MoviesList.objects.get(user=request.user)

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
def delete_movie(request):
    if request.method == 'POST':
        movie_to_delete = Movie.objects.get(pk=request.POST.get('id'))
        movie_to_delete.delete()
        return redirect(reverse('home'))
    return render(request, 'home.html')


def get_dominant_color(image_path, k=4):
    response = requests.get(image_path)
    image = Image.open(BytesIO(response.content))

    def calculate_dominant_color(image):
        # Convertir en RGB si l'image est en noir et blanc
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image_np = np.array(image)
        half_height = image_np.shape[0] // 2

        if image_np.ndim == 3:
            top_half = image_np[:half_height, :, :]
            pixels = top_half.reshape(-1, 3)
        else:
            top_half = image_np[:half_height, :]
            pixels = top_half.reshape(-1, 1)

        kmeans = KMeans(n_clusters=k)
        kmeans.fit(pixels)
        counts = Counter(kmeans.labels_)
        most_common_cluster = counts.most_common(1)[0][0]
        dominant_color = kmeans.cluster_centers_[most_common_cluster]

        return dominant_color.astype(int)

    dominant_color = calculate_dominant_color(image)
    try:
        dominant_color_hex = '#%02x%02x%02x' % tuple(dominant_color)
    except TypeError:
        dominant_color_hex = ''

    if not dominant_color_hex:
        image = image.resize((150, 150))
        dominant_color = calculate_dominant_color(image)
        dominant_color_hex = '#%02x%02x%02x' % tuple(dominant_color)

    return dominant_color_hex