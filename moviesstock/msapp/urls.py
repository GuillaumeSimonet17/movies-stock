from django.urls import path
from . import movies_list_views, watched_views
from . import movie_page_views

urlpatterns = [
    path('', movies_list_views.home, name='home'),
    path('movie_page/', movie_page_views.movie_page, name='movie_page'),
    path('search_movies/', movies_list_views.search_movies, name='search_movies'),
    path('search_tv/', movies_list_views.search_tv, name='search_tv'),
    path('add_movie/', movies_list_views.add_movie, name='add_movie'),
    path('get_images/', movies_list_views.get_images_and_links, name='get_images'),
    path('delete_movie/',movies_list_views.delete_movie,name="delete_movie"),
    path('add_to_watched_list/',movies_list_views.add_to_watched_list,name="add_to_watched_list"),
    path('random_movie/', movies_list_views.random_movie, name='random_movie'),
    path("watched/", watched_views.watched_list, name="watched_list"),
]
