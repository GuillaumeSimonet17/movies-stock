from django.http import JsonResponse
import requests
from django.shortcuts import redirect, render
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .models import Movie, MoviesList, FilePath
import string
import deepl

from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
from io import BytesIO
from collections import Counter


URL_TMDB = 'https://api.themoviedb.org/3/'
URL_YTS = 'https://en.yts-official.mx/movies/'

API_KEY_TMDB = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MTA2MjRmYjZmOGNkMGEzMjc5YTk4ZmJhZDBkYTA4ZCIsIm5iZiI6MTcxOTYxNTIyNi42MTcyMzksInN1YiI6IjYyMTNhNzJkODEzODMxMDAxYzYxN2Q2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.KHP_u0H2ra2mASaXmyeiEX-qQiyCfhCK_HSeNbDvyn8'
API_KEY_DEEPL = '54f88a40-a6c4-4a68-bdee-460f77863eb4:fx'


@login_required
def home(request):
    movies = Movie.objects.all()
    movies_list, created = MoviesList.objects.get_or_create(
        user=request.user,
        defaults={'name': request.user.username + '\'s list'}
    )

    context = {
        'movies': movies,
        'movies_list': movies_list.movies.all().order_by('-id'),
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
    return JsonResponse()

@login_required
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

        title_no_punct = movie.title.translate(str.maketrans('', '', string.punctuation))
        title_dash = title_no_punct.replace(' ', '-')
        year_date = movie.release_date.year
        yts = URL_YTS + title_dash + '-' + str(year_date)

        if movie.budget and int(movie.budget) > 0:
            budget = int(movie.budget) // 1_000_000
            budget_parsed = str(budget) + 'M'
            movie.budget = budget_parsed

        movie.overview = synopsis_translate
        movie.url_yts = yts
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
                title=movie_detailed.get('title'),
                poster_path=movie_detailed.get('poster_path'),
                release_date=movie_detailed.get('release_date') or None,
                genre_ids=movie_detailed.get('genres') or None,
                overview=movie_detailed.get('overview') or None,
                actors=actors_combined,
                directors=directors_combined,
                budget=movie_detailed.get('budget') or None,
                origin_country=movie_detailed.get('origin_country') or None,
                production_companies=movie_detailed.get('production_companies') or None,
                status=movie_detailed.get('status'),
                dominant_color=dominant_color,
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

    image = image.resize((150, 150))
    image_np = np.array(image)

    half_height = image_np.shape[0] // 2
    top_half = image_np[:half_height, :, :]
    pixels = top_half.reshape(-1, 3)

    kmeans = KMeans(n_clusters=k)
    kmeans.fit(pixels)
    counts = Counter(kmeans.labels_)
    most_common_cluster = counts.most_common(1)[0][0]
    dominant_color = kmeans.cluster_centers_[most_common_cluster]

    dominant_color_hex = '#%02x%02x%02x' % tuple(dominant_color.astype(int))
    return dominant_color_hex
