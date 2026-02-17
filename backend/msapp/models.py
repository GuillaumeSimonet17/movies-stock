from django.db import models
from django.contrib.auth.models import User


class Movie(models.Model):
    movie_id = models.IntegerField(null=True, unique=True)
    title = models.CharField(max_length=255, db_index=True)
    poster_path = models.CharField(max_length=255)
    release_date = models.DateField(blank=True, null=True, db_index=True)
    genre_ids = models.JSONField(null=True)
    overview = models.TextField(null=True)
    actors = models.CharField(null=True)
    directors = models.CharField(null=True)
    budget = models.CharField(null=True)
    origin_country = models.CharField(max_length=255, null=True)
    production_companies = models.JSONField(null=True)
    status = models.CharField()
    dominant_color = models.CharField(max_length=7, null=True, blank=True)
    is_tv = models.BooleanField(default=False, db_index=True)

class FilePath(models.Model):
    movie = models.ForeignKey(Movie, related_name='file_paths', on_delete=models.CASCADE)
    file_path = models.CharField(max_length=255)

class MovieListItem(models.Model):
    movies_list = models.ForeignKey('MoviesList', on_delete=models.CASCADE, related_name='list_items')
    movie = models.ForeignKey('Movie', on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        unique_together = ('movies_list', 'movie')
        ordering = ['-added_at']

class MoviesList(models.Model):
    name = models.CharField(max_length=100)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True)
    movies = models.ManyToManyField(
        Movie,
        through='MovieListItem',
        related_name='movies_lists'
    )

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True)

class WatchedMovie(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="watched_movies")
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="watched_by")
    watched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'movie')

    def __str__(self):
        return f"{self.user.username} watched {self.movie.title}"
