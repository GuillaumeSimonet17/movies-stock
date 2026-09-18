from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from msapp.models import MoviesList, MovieListItem, Movie, WatchedMovie
from msapp.serializers import MovieListSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_watched_count(request):
    count = WatchedMovie.objects.filter(user=request.user).count()
    return Response({'count': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_lists(request):
    lists = MoviesList.objects.filter(user=request.user, is_collection=False).order_by('id')
    data = [
        {
            'id': lst.id,
            'name': lst.name,
            'icon': lst.icon,
            'count': lst.list_items.count(),
        }
        for lst in lists
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user_list(request):
    name = request.data.get('name', '').strip()
    if not name:
        return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
    icon = request.data.get('icon', '🎬')
    lst = MoviesList.objects.create(user=request.user, name=name, icon=icon, is_collection=False)
    return Response({'id': lst.id, 'name': lst.name, 'icon': lst.icon, 'count': 0}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_list_detail(request, list_id):
    try:
        lst = MoviesList.objects.get(id=list_id, user=request.user, is_collection=False)
    except MoviesList.DoesNotExist:
        return Response({'error': 'List not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        items = lst.list_items.select_related('movie').order_by('-added_at')
        movies = []
        for item in items:
            movie = item.movie
            movie.added_at = item.added_at
            movies.append(MovieListSerializer(movie).data)
        return Response({'id': lst.id, 'name': lst.name, 'icon': lst.icon, 'movies': movies})

    if request.method == 'PUT':
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
        lst.name = name
        if 'icon' in request.data:
            lst.icon = request.data['icon']
        lst.save()
        return Response({'id': lst.id, 'name': lst.name, 'icon': lst.icon, 'count': lst.list_items.count()})

    if request.method == 'DELETE':
        lst.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_add_to_list(request, list_id):
    """Search TMDB and add movie to list (adding to collection first if needed)."""
    from msapp.api.views.movie_views import get_images_and_links, get_keywords
    from msapp.utils import search_detailed_movies, get_dominant_color, URL_TMDB, API_KEY_TMDB
    from msapp.serializers import MovieSerializer

    try:
        lst = MoviesList.objects.get(id=list_id, user=request.user, is_collection=False)
    except MoviesList.DoesNotExist:
        return Response({'error': 'List not found'}, status=status.HTTP_404_NOT_FOUND)

    tmdb_id = request.data.get('tmdb_id')
    is_tv = request.data.get('is_tv', False)
    if not tmdb_id:
        return Response({'error': 'tmdb_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Ensure movie exists in DB (add to collection if not)
    movie = Movie.objects.filter(movie_id=tmdb_id).first()
    if not movie:
        endpoint = 'tv' if is_tv else 'movie'
        movie_data = search_detailed_movies(f"https://api.themoviedb.org/3/{endpoint}/{tmdb_id}")
        if not movie_data:
            return Response({'error': 'Movie not found on TMDb'}, status=status.HTTP_404_NOT_FOUND)

        credits = search_detailed_movies(f"https://api.themoviedb.org/3/{endpoint}/{tmdb_id}/credits")
        actors = directors = None
        if credits:
            actors = ", ".join([a['name'] for a in credits.get('cast', [])[:5]])
            directors = ", ".join([c['name'] for c in credits.get('crew', []) if c.get('job') == 'Director'])

        poster_path = movie_data.get('poster_path', '')
        dominant_color = '#1a1a1a'
        if poster_path:
            try:
                dominant_color = get_dominant_color(f"https://image.tmdb.org/t/p/w500{poster_path}")
            except Exception:
                pass

        movie = Movie.objects.create(
            movie_id=tmdb_id,
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
            status=movie_data.get('status', ''),
        )
        get_images_and_links(movie)
        get_keywords(movie, endpoint, tmdb_id)

    # Add to the custom list
    _, created = MovieListItem.objects.get_or_create(movies_list=lst, movie=movie)
    if not created:
        return Response({'error': 'Movie already in list'}, status=status.HTTP_409_CONFLICT)

    return Response(MovieSerializer(movie).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_movie_to_list(request, list_id):
    try:
        lst = MoviesList.objects.get(id=list_id, user=request.user, is_collection=False)
    except MoviesList.DoesNotExist:
        return Response({'error': 'List not found'}, status=status.HTTP_404_NOT_FOUND)

    movie_id = request.data.get('movie_id')
    if not movie_id:
        return Response({'error': 'movie_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        movie = Movie.objects.get(id=movie_id)
    except Movie.DoesNotExist:
        return Response({'error': 'Movie not found'}, status=status.HTTP_404_NOT_FOUND)

    _, created = MovieListItem.objects.get_or_create(movies_list=lst, movie=movie)
    if not created:
        return Response({'error': 'Movie already in list'}, status=status.HTTP_409_CONFLICT)

    return Response({'message': 'Movie added'}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_movie_from_list(request, list_id, movie_id):
    try:
        lst = MoviesList.objects.get(id=list_id, user=request.user)
    except MoviesList.DoesNotExist:
        return Response({'error': 'List not found'}, status=status.HTTP_404_NOT_FOUND)

    deleted, _ = MovieListItem.objects.filter(movies_list=lst, movie__id=movie_id).delete()
    if not deleted:
        return Response({'error': 'Movie not in list'}, status=status.HTTP_404_NOT_FOUND)

    # If collection, delete orphaned movie
    if lst.is_collection:
        try:
            movie = Movie.objects.get(id=movie_id)
            if not movie.movies_lists.exists() and not movie.watched_by.exists():
                movie.delete()
        except Movie.DoesNotExist:
            pass

    return Response(status=status.HTTP_204_NO_CONTENT)
