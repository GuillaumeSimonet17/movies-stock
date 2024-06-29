from django.db import models


class Movie(models.Model):
    title = models.CharField(max_length=255)
    poster_path = models.CharField(max_length=255)
    release_date = models.DateField()
    genre_ids = models.JSONField()
    overview = models.TextField()
    budget = models.IntegerField()
    origin_country = models.CharField(max_length=255)
    production_companies = models.JSONField()
    status = models.CharField()