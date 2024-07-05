from django.utils import timezone
from django.shortcuts import redirect, render, reverse
from .models import Movie, MoviesList
from .views import search_detailed_movies
import colorsys


def movie_page(request):
    if request.method == 'GET' and 'query' in request.GET:
        movie = Movie.objects.get(pk=request.GET.get('query'))

        if movie.status != 'Released' and movie.release_date < timezone.now().date():
            movie_detailed = search_detailed_movies(movie.movie_id)
            if movie_detailed:
                movie.release_date = movie_detailed.get('release_date') or None
                movie.budget=movie_detailed.get('budget') or None
                movie.status=movie_detailed.get('status') or None
                movie.save()

        movies_list = MoviesList.objects.first()
        movie_ids = list(movies_list.movies.values_list('id', flat=True))

        darkness = color_darkness(movie.dominant_color)
        text_color, background = get_text_background_colors(darkness, movie.dominant_color)

        context = {
            'movie': movie,
            'movies_list': movie_ids,
            'text_color': text_color,
            'background': background,
        }
        return render(request, 'movie_page_template.html', context)

def get_text_background_colors(darkness, dominant_color):
    if darkness < 0.1:
        text_color = '#E6E6E6FF'
    elif 0.1 < darkness < 0.4:
        text_color = lighten_color(dominant_color, 100)
    elif 0.4 < darkness < 0.6:
        text_color = darken_color(dominant_color, 50)
    else:
        text_color = darken_color(dominant_color, 70)

    if darkness < 0.1:
        background = '#5C5C5C26'
    else:
        background = '#FFFFFF9E'

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