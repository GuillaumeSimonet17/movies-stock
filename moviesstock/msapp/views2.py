from io import text_encoding

from django.utils import timezone
from django.shortcuts import redirect, render, reverse
from .models import Movie, MoviesList
from .views import search_detailed_movies
from django.contrib.auth.decorators import login_required
import colorsys
import string

URL_YTS_1 = 'https://en.yts-official.mx/movies/'
URL_YTS_2 = 'https://yts.rs/movie/'

@login_required
def movie_page(request):
    if request.method == 'GET' and 'query' in request.GET:
        movie = Movie.objects.get(pk=request.GET.get('query'))

        title_no_punct = movie.title.translate(str.maketrans('', '', string.punctuation))
        title_dash = title_no_punct.replace(' ', '-')

        yts1 = ''
        yts2 = ''
        if movie.release_date and movie.release_date.year:
            year_date = movie.release_date.year
            yts1 = URL_YTS_1 + title_dash + '-' + str(year_date)
            yts2 = URL_YTS_2 + title_dash.lower() + '-' + str(year_date)

        if movie.status != 'Released' and movie.release_date and movie.release_date < timezone.now().date():
            movie_detailed = search_detailed_movies(movie.movie_id)
            if movie_detailed:
                movie.release_date = movie_detailed.get('release_date') or None
                movie.budget=movie_detailed.get('budget') or None
                movie.status=movie_detailed.get('status') or None
                movie.save()

        movies_list = MoviesList.objects.get(user=request.user)
        movies = movies_list.movies.all()
        movies_filtered = movies

        order = '-id'
        ordered_by = request.GET.get('ord')
        genre = request.GET.get('gnr')
        if genre != 'All':
            movies_filtered = movies.filter(genre_ids__contains=[{'name': genre}])

        if ordered_by and ordered_by != 'Date added':
            if ordered_by == 'Year Asc':
                order = '-release_date'
            elif ordered_by == 'Year Dsc':
                order = 'release_date'

        movies_filtered = movies_filtered.order_by(order)
        movies = list(movies_filtered.values_list('id', flat=True))
        movies_list_length = len(movies)

        darkness = color_darkness(movie.dominant_color)
        text_color, background = get_text_background_colors(darkness, movie.dominant_color)
        context = {
            'movie': movie,
            'movies_list': movies,
            'text_color': text_color,
            'background': background,
            'movies_list_length': movies_list_length,
            'yts1': yts1 or None,
            'yts2': yts2 or None,
            'genre_selected': genre,

            'ordered_selected': ordered_by,
            'ordered_selected_value': ordered_by,
        }
        return render(request, 'movie_page.html', context)

def get_text_background_colors(darkness, dominant_color):
    if darkness < 0.1:
        text_color = '#E6E6E6FF'
    elif 0.1 < darkness < 0.4:
        text_color = lighten_color(dominant_color, 100)
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