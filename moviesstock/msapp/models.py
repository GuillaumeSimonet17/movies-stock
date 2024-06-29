from django.db import models


class Movie(models.Model):
    title = models.CharField(max_length=255)
    poster_path = models.CharField(max_length=255)
    release_date = models.DateField(blank=True, null=True)
    genre_ids = models.JSONField(null=True)
    overview = models.TextField(null=True)
    budget = models.IntegerField(null=True)
    origin_country = models.CharField(max_length=255, null=True)
    production_companies = models.JSONField(null=True)
    status = models.CharField()


class MoviesList(models.Model):
    name = models.CharField(max_length=100, default='Main List')

    movies = models.ManyToManyField(Movie, related_name='movies_lists')
