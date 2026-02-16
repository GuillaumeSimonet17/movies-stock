from django.urls import path
from .views import auth_views, movie_views, watched_views

app_name = 'api'

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', auth_views.login_view, name='login'),
    path('auth/logout/', auth_views.logout_view, name='logout'),
    path('auth/signup/', auth_views.signup_view, name='signup'),
    path('auth/user/', auth_views.current_user_view, name='current-user'),
    path('auth/check/', auth_views.check_auth_view, name='check-auth'),

    # Movie endpoints
    path('movies/', movie_views.get_movies, name='movies-list'),
    path('movies/search/', movie_views.search_movies, name='movies-search'),
    path('movies/add/', movie_views.add_movie, name='movies-add'),
    path('movies/random/', movie_views.random_movie, name='movies-random'),
    path('movies/<int:movie_id>/', movie_views.get_movie_detail, name='movie-detail'),
    path('movies/<int:movie_id>/delete/', movie_views.delete_movie, name='movie-delete'),

    # Watched endpoints
    path('watched/', watched_views.get_watched_movies, name='watched-list'),
    path('watched/add/', watched_views.add_to_watched, name='watched-add'),
    path('watched/stats/', watched_views.get_watched_stats, name='watched-stats'),
    path('watched/<int:movie_id>/delete/', watched_views.remove_from_watched, name='watched-delete'),
]
