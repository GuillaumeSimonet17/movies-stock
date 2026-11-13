"""Keep stored movie data in sync with TMDb after a movie has been added.

- Release dates (and status) of titles not released yet are re-fetched daily.
  Released titles are never re-fetched.
- Netflix availability changes are persisted on the Movie and, when a title
  arrives on Netflix, a MovieNotification is created for each user who has it
  in their collection.
"""
import logging
import threading
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.db import close_old_connections
from django.db.models import F, Q
from django.utils import timezone

from msapp.models import Movie, MovieListItem, MovieNotification
from msapp.utils import URL_TMDB, search_detailed_movies

logger = logging.getLogger(__name__)

PARIS_TZ = ZoneInfo('Europe/Paris')
FR_REGION = 'FR'

# TMDb release types: 1 premiere, 2 limited theatrical, 3 theatrical, 4 digital, 5 physical, 6 TV.
# Festival premieres are ignored; the wide theatrical release wins, then the others.
FR_RELEASE_TYPE_PRIORITY = [{3}, {2}, {4}, {5, 6}]

REFRESH_INTERVAL = timedelta(days=1)
# A French date is often announced after the US release: keep looking for it a while.
FR_DATE_LOOKUP_WINDOW = timedelta(days=90)
FINAL_STATUSES = {'Released', 'Canceled'}

BACKGROUND_BATCH_SIZE = 25
BACKGROUND_LOCK_KEY = 'movie_refresh_lock'
BACKGROUND_LOCK_TIMEOUT = 60 * 15


def today_in_france():
    return datetime.now(PARIS_TZ).date()


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except (TypeError, ValueError):
        return None


def pick_fr_release_date(release_dates_payload):
    """Return the French release date from a TMDb `release_dates` payload, or None."""
    results = (release_dates_payload or {}).get('results', [])
    fr = next((r for r in results if r.get('iso_3166_1') == FR_REGION), None)
    if not fr:
        return None
    entries = [
        (entry.get('type'), _parse_date(entry.get('release_date')))
        for entry in fr.get('release_dates', [])
    ]
    for types in FR_RELEASE_TYPE_PRIORITY:
        dates = [d for t, d in entries if t in types and d]
        if dates:
            return min(dates)
    return None


def fetch_movie_details(tmdb_id, is_tv):
    endpoint = 'tv' if is_tv else 'movie'
    url = f'{URL_TMDB}{endpoint}/{tmdb_id}'
    if not is_tv:
        url += '?append_to_response=release_dates'
    return search_detailed_movies(url)


def refresh_movie(movie):
    """Re-fetch the release dates and status from TMDb. Returns True on success."""
    if not movie.movie_id:
        return False
    data = fetch_movie_details(movie.movie_id, movie.is_tv)
    if not data:
        return False

    release_date = _parse_date(data.get('release_date') or data.get('first_air_date'))
    if release_date:
        movie.release_date = release_date
    if data.get('status'):
        movie.status = data['status']
    if not movie.is_tv:
        movie.fr_release_date = pick_fr_release_date(data.get('release_dates'))

    movie.refreshed_at = timezone.now()
    movie.save(update_fields=['release_date', 'status', 'fr_release_date', 'refreshed_at'])
    return True


def not_released_q(today):
    """Titles whose release (US or France) is still to come."""
    return (
        Q(release_date__isnull=True)
        | Q(release_date__gte=today)
        | Q(fr_release_date__gte=today)
        | Q(is_tv=False, fr_release_date__isnull=True, release_date__gte=today - FR_DATE_LOOKUP_WINDOW)
        | (Q(is_tv=False) & ~Q(status__in=FINAL_STATUSES))
    )


def stale_movies_queryset():
    """Movies in a list, not released yet, not refreshed today. Never-refreshed movies come first
    (they are checked once even if released, to get their French date)."""
    now = timezone.now()
    due = (
        Q(refreshed_at__isnull=True)
        | (not_released_q(today_in_france()) & Q(refreshed_at__lt=now - REFRESH_INTERVAL))
    )
    in_a_list = Movie.objects.filter(
        id__in=MovieListItem.objects.values('movie_id')
    )
    return in_a_list.filter(due).order_by(F('refreshed_at').asc(nulls_first=True))


def refresh_stale_movies(limit=None):
    """Refresh due movies. Returns the number of movies refreshed."""
    movies = stale_movies_queryset()
    if limit:
        movies = movies[:limit]
    refreshed = 0
    for movie in movies:
        try:
            if refresh_movie(movie):
                refreshed += 1
        except Exception:
            logger.exception('Refresh failed for movie %s', movie.pk)
    return refreshed


def _background_refresh():
    try:
        refresh_stale_movies(limit=BACKGROUND_BATCH_SIZE)
    finally:
        close_old_connections()


def trigger_background_refresh():
    """Refresh a batch of stale movies in a background thread (at most one run per 15 min)."""
    if not cache.add(BACKGROUND_LOCK_KEY, True, timeout=BACKGROUND_LOCK_TIMEOUT):
        return False
    threading.Thread(target=_background_refresh, daemon=True).start()
    return True


def record_netflix_statuses(movie_statuses):
    """Persist Netflix availability and notify collection owners when a title arrives on Netflix.

    `movie_statuses` is an iterable of (Movie, bool | None). None (lookup error) is ignored.
    The first known status is stored silently: only a False -> True change notifies.
    """
    for movie, on_netflix in movie_statuses:
        if on_netflix is None or on_netflix == movie.on_netflix:
            continue
        arrived = movie.on_netflix is False and on_netflix
        Movie.objects.filter(pk=movie.pk).update(on_netflix=on_netflix)
        movie.on_netflix = on_netflix
        if arrived:
            notify_netflix_arrival(movie)


def notify_netflix_arrival(movie):
    user_ids = set(
        MovieListItem.objects.filter(movie=movie, movies_list__is_collection=True)
        .values_list('movies_list__user_id', flat=True)
    )
    already_notified = set(
        MovieNotification.objects.filter(
            movie=movie, kind=MovieNotification.KIND_NETFLIX, is_read=False, user_id__in=user_ids,
        ).values_list('user_id', flat=True)
    )
    MovieNotification.objects.bulk_create([
        MovieNotification(user_id=user_id, movie=movie, kind=MovieNotification.KIND_NETFLIX)
        for user_id in user_ids - already_notified if user_id
    ])
