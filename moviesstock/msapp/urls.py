from django.contrib import admin
from django.urls import path
from . import views
from . import views2


urlpatterns = [
    path('', views.home, name='home'),
    path('movie_page/', views2.movie_page, name='movie_page'),
    path('search_movies/', views.search_movies, name='search_movies'),
    path('add_movie/', views.add_movie, name='add_movie'),
    path('delete_movie/',views.delete_movie,name="delete_movie"),
]
