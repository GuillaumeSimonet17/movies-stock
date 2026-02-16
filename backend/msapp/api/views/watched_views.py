from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from django.db.models.functions import TruncYear, TruncMonth, TruncWeek
from msapp.models import WatchedMovie, Movie, MoviesList
from msapp.serializers import WatchedMovieSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_watched_movies(request):
    """Get user's watched movies with optional grouping"""
    group_by = request.GET.get('group_by', 'all')

    watched_movies = WatchedMovie.objects.filter(user=request.user).select_related('movie')

    if not group_by or group_by == 'all':
        # Return ungrouped
        return Response({
            'watched_movies': WatchedMovieSerializer(
                watched_movies.order_by('-watched_at'),
                many=True
            ).data,
            'grouped_watched': {},
            'total_count': watched_movies.count()
        })

    # Group by time period
    if group_by == 'year':
        annotated = watched_movies.annotate(period=TruncYear('watched_at'))
    elif group_by == 'month':
        annotated = watched_movies.annotate(period=TruncMonth('watched_at'))
    elif group_by == 'week':
        annotated = watched_movies.annotate(period=TruncWeek('watched_at'))
    else:
        annotated = watched_movies

    # Organize into groups
    groups_dict = {}
    for wm in annotated.order_by('-watched_at'):
        period_key = wm.period.strftime('%Y-%m-%d') if hasattr(wm, 'period') else 'All'

        # Format period label
        if group_by == 'year':
            period_label = wm.period.strftime('%Y')
        elif group_by == 'month':
            period_label = wm.period.strftime('%B %Y')
        elif group_by == 'week':
            period_label = f"Week of {wm.period.strftime('%Y-%m-%d')}"
        else:
            period_label = 'All'

        if period_key not in groups_dict:
            groups_dict[period_key] = {
                'label': period_label,
                'movies': [],
                'count': 0
            }

        groups_dict[period_key]['movies'].append(
            WatchedMovieSerializer(wm).data
        )

        groups_dict[period_key]['count'] += 1

    return Response({
        'watched_movies': [],  # Empty when grouped
        'grouped_watched': groups_dict,
        'total_count': watched_movies.count(),
        'group_by': group_by
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_watched(request):
    """Mark movie as watched"""
    movie_id = request.data.get('movie_id')

    if not movie_id:
        return Response(
            {'error': 'movie_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        movie = Movie.objects.get(id=movie_id)

        # Create watched entry
        watched, created = WatchedMovie.objects.get_or_create(
            user=request.user,
            movie=movie
        )

        if not created:
            return Response(
                {'error': 'Movie already in watched list'},
                status=status.HTTP_409_CONFLICT
            )

        # Remove from collection
        try:
            movies_list = MoviesList.objects.get(user=request.user)
            movies_list.movies.remove(movie)
        except MoviesList.DoesNotExist:
            pass  # User might not have a movies list yet

        return Response(
            WatchedMovieSerializer(watched).data,
            status=status.HTTP_201_CREATED
        )
    except Movie.DoesNotExist:
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_watched_stats(request):
    """Get statistics about watched movies"""
    watched_count = WatchedMovie.objects.filter(user=request.user).count()

    # Group by year
    by_year = WatchedMovie.objects.filter(user=request.user)\
        .annotate(year=TruncYear('watched_at'))\
        .values('year')\
        .annotate(count=Count('id'))\
        .order_by('-year')

    return Response({
        'total_watched': watched_count,
        'by_year': [
            {
                'year': item['year'].year if item['year'] else None,
                'count': item['count']
            }
            for item in by_year
        ]
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_watched(request, movie_id):
    """Remove movie from watched list"""
    try:
        movie = Movie.objects.get(id=movie_id)
        watched = WatchedMovie.objects.get(user=request.user, movie=movie)
        watched.delete()

        return Response({'message': 'Movie removed from watched list'})
    except Movie.DoesNotExist:
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except WatchedMovie.DoesNotExist:
        return Response(
            {'error': 'Movie not in watched list'},
            status=status.HTTP_404_NOT_FOUND
        )
