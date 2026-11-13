from django.core.management.base import BaseCommand

from msapp.models import Movie, MovieListItem
from msapp.movie_refresh import refresh_movie, refresh_stale_movies


class Command(BaseCommand):
    help = "Re-fetch movie data from TMDb (release dates, status, rating...)."

    def add_arguments(self, parser):
        parser.add_argument('--all', action='store_true', help='Refresh every movie in a list, not only stale ones.')
        parser.add_argument('--limit', type=int, default=None, help='Max number of stale movies to refresh.')

    def handle(self, *args, **options):
        if options['all']:
            movies = Movie.objects.filter(id__in=MovieListItem.objects.values('movie_id'))
            count = sum(1 for movie in movies.iterator() if refresh_movie(movie))
        else:
            count = refresh_stale_movies(limit=options['limit'])
        self.stdout.write(self.style.SUCCESS(f'{count} movie(s) refreshed'))
