from django.db import models
from django.contrib.auth.models import User


class Movie(models.Model):
    movie_id = models.IntegerField(null=True)
    title = models.CharField(max_length=255)
    poster_path = models.CharField(max_length=255)
    release_date = models.DateField(blank=True, null=True)
    genre_ids = models.JSONField(null=True)
    overview = models.TextField(null=True)
    actors = models.CharField(null=True)
    directors = models.CharField(null=True)
    budget = models.CharField(null=True)
    origin_country = models.CharField(max_length=255, null=True)
    production_companies = models.JSONField(null=True)
    status = models.CharField()
    dominant_color = models.CharField(max_length=7, null=True, blank=True)

class FilePath(models.Model):
    movie = models.ForeignKey(Movie, related_name='file_paths', on_delete=models.CASCADE)
    file_path = models.CharField(max_length=255)

class MoviesList(models.Model):
    name = models.CharField(max_length=100)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True)
    movies = models.ManyToManyField(Movie, related_name='movies_lists')

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True)
