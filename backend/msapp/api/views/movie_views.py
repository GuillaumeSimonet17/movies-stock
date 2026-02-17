import deepl
import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from msapp.models import Movie, MoviesList, MovieListItem, FilePath
from msapp.utils import URL_TMDB, API_KEY_DEEPL
from msapp.serializers import MovieSerializer, MovieListSerializer
from msapp.utils import search_detailed_movies, get_dominant_color, API_KEY_TMDB
import random
import colorsys
import string

URL_YTS_1 = 'https://www.yts-official.cc/movies/'
URL_YTS_2 = 'https://yts.rs/movie/'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_movies(request):
    movies_list, _ = MoviesList.objects.get_or_create(
        user=request.user,
        defaults={'name': f"{request.user.username}'s list"}
    )

    search_query = request.GET.get('search', '')
    genre_selected = request.GET.get('genre', 'All')
    order_selected = request.GET.get('order_by', 'Date added')
    tv_selected = request.GET.get('is_tv', 'All')

    # Query through MovieListItem with optimized joins
    base_queryset = MovieListItem.objects.filter(
        movies_list=movies_list
    ).select_related('movie').prefetch_related('movie__file_paths')

    # Apply filters on the movie relationship
    if search_query:
        base_queryset = base_queryset.filter(Q(movie__title__icontains=search_query))

    if genre_selected != 'All' and genre_selected != 'No genre':
        base_queryset = base_queryset.filter(movie__genre_ids__contains=[{'name': genre_selected}])
    elif genre_selected == 'No genre':
        base_queryset = base_queryset.filter(movie__genre_ids=[])

    if tv_selected != 'All':
        base_queryset = base_queryset.filter(movie__is_tv=(tv_selected == 'Series'))

    # Ordering - default is by added_at (most recent first)
    order = '-added_at'
    if order_selected == 'Year Asc':
        order = 'movie__release_date'
    elif order_selected == 'Year Dsc':
        order = '-movie__release_date'

    # Get list items ordered
    list_items = list(base_queryset.order_by(order))

    # Extract movies with added_at metadata
    all_movies = []
    for item in list_items:
        movie = item.movie
        movie.added_at = item.added_at  # Attach added_at for serialization
        all_movies.append(movie)

    # Get latest movies by added_at
    latest_movies = list_items[:15]
    latest_ids = {item.movie.id for item in latest_movies}

    serialized_movies = MovieListSerializer(all_movies, many=True).data

    movies_by_genre = {}
    movies_by_genre['Latest'] = [m for m in serialized_movies if m['id'] in latest_ids]

    genre_set = set()
    for movie_data, movie_obj in zip(serialized_movies, all_movies):
        if not movie_obj.genre_ids:
            movies_by_genre.setdefault('No genre', []).append(movie_data)
            continue
        for genre in movie_obj.genre_ids:
            if isinstance(genre, dict) and (name := genre.get('name')):
                genre_set.add(name)
                movies_by_genre.setdefault(name, []).append(movie_data)

    return Response({
        "movies": serialized_movies,
        "grouped_by_genre": movies_by_genre,
        "available_genres": sorted(list(genre_set)),
        "total_count": len(all_movies),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_movies(request):
    """Search movies or TV shows on TMDb"""
    query = request.GET.get('query', '')
    is_tv = request.GET.get('is_tv', 'false') == 'true'

    if not query:
        return Response({'results': []})

    endpoint = 'tv' if is_tv else 'movie'
    url = f"https://api.themoviedb.org/3/search/{endpoint}?query={query}"

    results = search_detailed_movies(url)
    return Response(results if results else {'results': []})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_movie(request):
    """Add movie to user's collection"""
    movie_id = request.data.get('movie_id')
    is_tv = request.data.get('is_tv', False)

    if not movie_id:
        return Response(
            {'error': 'movie_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get or create user's movies list
    movies_list, _ = MoviesList.objects.get_or_create(
        user=request.user,
        defaults={'name': f"{request.user.username}'s list"}
    )

    # Check if movie already exists in database
    movie = Movie.objects.filter(movie_id=movie_id).first()

    # Check if MovieListItem already exists
    if movie:
        if MovieListItem.objects.filter(movies_list=movies_list, movie=movie).exists():
            return Response(
                {'error': 'Movie already in your list'},
                status=status.HTTP_409_CONFLICT
            )

    # Fetch full details from TMDb
    endpoint = 'tv' if is_tv else 'movie'
    movie_data = search_detailed_movies(
        f"https://api.themoviedb.org/3/{endpoint}/{movie_id}"
    )

    if not movie_data:
        return Response(
            {'error': 'Movie not found on TMDb'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get or create movie
    if not movie:
        # Extract actors and directors
        credits = search_detailed_movies(
            f"https://api.themoviedb.org/3/{endpoint}/{movie_id}/credits"
        )

        actors = None
        directors = None

        if credits:
            actors_list = [actor['name'] for actor in credits.get('cast', [])[:5]]
            directors_list = [
                crew['name'] for crew in credits.get('crew', [])
                if crew.get('job') == 'Director'
            ]

            actors = ", ".join(actors_list)
            directors = ", ".join(directors_list)

        # Get dominant color from poster
        poster_path = movie_data.get('poster_path', '')
        dominant_color = '#000000'
        if poster_path:
            image_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
            try:
                dominant_color = get_dominant_color(image_url)
            except Exception as e:
                print(f"Error getting dominant color: {e}")
                dominant_color = '#1a1a1a'

        # Create movie
        movie = Movie.objects.create(
            movie_id=movie_id,
            title=movie_data.get('title') or movie_data.get('name'),
            poster_path=poster_path,
            release_date=movie_data.get('release_date') or movie_data.get('first_air_date'),
            genre_ids=movie_data.get('genres', []),
            actors=actors,
            overview=movie_data.get('overview'),
            directors=directors,
            budget=movie_data.get('budget', 0),
            dominant_color=dominant_color,
            is_tv=is_tv,
            production_companies=movie_data.get('production_companies') or None,
            origin_country=movie_data.get('origin_country', []),
            status=movie_data.get('status', '')
        )
        get_images_and_links(movie)

    # Create MovieListItem (no duplicates due to unique_together)
    MovieListItem.objects.create(
        movies_list=movies_list,
        movie=movie
    )

    return Response(
        MovieSerializer(movie).data,
        status=status.HTTP_201_CREATED
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_movie_detail(request, movie_id):
    try:
        movie = Movie.objects.get(pk=movie_id)

        # ✅ Vérifie accès utilisateur via MovieListItem
        movies_list = MoviesList.objects.get(user=request.user)
        if not MovieListItem.objects.filter(movies_list=movies_list, movie=movie).exists():
            return Response(
                {'error': 'Movie not in your list'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 🎬 Génération liens YTS
        yts1 = None
        yts2 = None
        if movie.release_date and movie.release_date.year:
            title_no_punct = movie.title.translate(str.maketrans('', '', string.punctuation))
            title_dash = title_no_punct.replace(' ', '-')
            year = movie.release_date.year
            yts1 = URL_YTS_1 + title_dash + '-' + str(year)
            yts2 = URL_YTS_2 + title_dash.lower() + '-' + str(year)

        # 🎞️ Sérialisation film
        movie_data = MovieSerializer(movie).data

        # ✅ Images / fichiers
        movie_data['filepath_set'] = [
            {'file_path': fp.file_path}
            for fp in movie.file_paths.all()
        ]

        # 🎨 Couleurs dynamiques (MANQUAIT)
        darkness = color_darkness(movie.dominant_color)
        text_color, background = get_text_background_colors(darkness, movie.dominant_color)

        # 🎬 Liste utilisateur filtrée via MovieListItem
        list_items = MovieListItem.objects.filter(
            movies_list=movies_list
        ).select_related('movie')

        genre = request.GET.get('gnr')
        ordered_by = request.GET.get('ord')
        order = '-added_at'

        if genre and genre != 'All':
            list_items = list_items.filter(movie__genre_ids__contains=[{'name': genre}])

        if ordered_by and ordered_by != 'Date added':
            if ordered_by == 'Year Asc':
                order = '-movie__release_date'
            elif ordered_by == 'Year Dsc':
                order = 'movie__release_date'

        list_items = list_items.order_by(order)
        movies_ids = list(list_items.values_list('movie__id', flat=True))

        return Response({
            'movie': movie_data,
            'movies_list': movies_ids,
            'movies_list_length': len(movies_ids),

            'text_color': text_color,
            'background': background,

            # liens download
            'yts1': yts1,
            'yts2': yts2,

            # filtres actifs
            'genre_selected': genre,
            'ordered_selected': ordered_by,
        })

    except Movie.DoesNotExist:
        return Response({'error': 'Movie not found'}, status=404)

    except MoviesList.DoesNotExist:
        return Response({'error': 'Movies list not found'}, status=404)

def get_text_background_colors(darkness, dominant_color):
    if darkness < 0.1:
        text_color = '#E6E6E6FF'
    elif 0.1 < darkness < 0.17:
        text_color = lighten_color(dominant_color, 350)
    elif 0.17 < darkness < 0.4:
        text_color = lighten_color(dominant_color, 250)
    elif 0.4 < darkness < 0.6:
        text_color = darken_color(dominant_color, 50)
    else:
        text_color = darken_color(dominant_color, 70)

    text_darkness = color_darkness(text_color)

    if text_darkness < 0.3:
        background = '#FFFFFFA0'
    else:
        background = '#5C5C5C26'

    if darkness < 0.1:
        background = '#FFFFFF84'
    if text_darkness > 0.8 and darkness < 0.1:
        background = '#C5C5C554'
    if text_darkness < 0.4 and darkness < 0.3:
        text_color = lighten_color(text_color, 30)

    return text_color, background

def color_darkness(hex_color):
    color = hex_color.lstrip('#')
    rgb = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
    return l

def darken_color(hex_color, percent):
    color = hex_color.lstrip('#')
    rgb = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
    new_l = max(0, min(1, l * (1 - percent / 100)))
    new_rgb = colorsys.hls_to_rgb(h, new_l, s)
    new_rgb = tuple(int(c * 255) for c in new_rgb)
    new_hex = '#{:02x}{:02x}{:02x}'.format(*new_rgb)
    return new_hex

def lighten_color(hex_color, percent):
    color = hex_color.lstrip('#')
    rgb = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0)
    new_l = max(0, min(1, l * (1 + percent / 100)))
    new_rgb = colorsys.hls_to_rgb(h, new_l, s)
    new_rgb = tuple(int(c * 255) for c in new_rgb)
    new_hex = '#{:02x}{:02x}{:02x}'.format(*new_rgb)
    return new_hex

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_movie(request, movie_id):
    """Remove movie from user's collection"""
    try:
        movie = Movie.objects.get(id=movie_id)
        movies_list = MoviesList.objects.get(user=request.user)

        # Delete MovieListItem
        list_item = MovieListItem.objects.filter(
            movies_list=movies_list,
            movie=movie
        ).first()

        if not list_item:
            return Response(
                {'error': 'Movie not in your list'},
                status=status.HTTP_404_NOT_FOUND
            )

        list_item.delete()

        # Delete movie if orphaned (not in any list and not watched)
        if not movie.movies_lists.exists() and not movie.watched_by.exists():
            movie.delete()

        return Response({'message': 'Movie deleted successfully'})
    except Movie.DoesNotExist:
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except MoviesList.DoesNotExist:
        return Response(
            {'error': 'Movies list not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def random_movie(request):
    """Get random movie from collection"""
    try:
        movies_list = MoviesList.objects.get(user=request.user)
        list_items = list(MovieListItem.objects.filter(
            movies_list=movies_list
        ).select_related('movie'))

        if not list_items:
            return Response(
                {'error': 'No movies in collection'},
                status=status.HTTP_404_NOT_FOUND
            )

        random_item = random.choice(list_items)
        return Response(MovieSerializer(random_item.movie).data)
    except MoviesList.DoesNotExist:
        return Response(
            {'error': 'Movies list not found'},
            status=status.HTTP_404_NOT_FOUND
        )

def get_images_and_links(movie):
    if movie.is_tv:
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

        movie.overview = synopsis_translate if synopsis_translate else movie.overview
        movie.save()

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from TMDb API: {e}")

