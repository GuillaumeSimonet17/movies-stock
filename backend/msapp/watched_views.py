from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.db.models.functions import TruncYear, TruncMonth, TruncWeek
from .models import WatchedMovie


@login_required
def watched_list(request):
    group_by = request.GET.get('group')  # None, year, month, week

    watched = WatchedMovie.objects.filter(
        user=request.user
    ).select_related('movie').order_by('-watched_at')

    watched_movies_length = len(watched)

    grouped = None

    if group_by in ['year', 'month', 'week']:
        if group_by == 'month':
            watched = watched.annotate(period=TruncMonth('watched_at'))
        elif group_by == 'week':
            watched = watched.annotate(period=TruncWeek('watched_at'))
        else:
            watched = watched.annotate(period=TruncYear('watched_at'))

        watched = watched.order_by('-period', '-watched_at')

        grouped = {}
        for item in watched:
            grouped.setdefault(item.period, []).append(item)

    context = {
        "watched_movies_length": watched_movies_length,
        "watched_movies": watched if not grouped else None,
        "grouped_watched": grouped,
        "group_by": group_by,
    }

    return render(request, "watched_list_template.html", context)
