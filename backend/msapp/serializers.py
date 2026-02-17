from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Movie,
    FilePath,
    MoviesList,
    UserProfile,
    WatchedMovie
)

class FilePathSerializer(serializers.ModelSerializer):
    class Meta:
        model = FilePath
        fields = ["id", "file_path"]

class MovieSerializer(serializers.ModelSerializer):
    file_paths = FilePathSerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = "__all__"

class MovieListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = ["id", "movie_id", "title", "poster_path", "release_date", "genre_ids", "is_tv"]

class FilePathCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FilePath
        fields = "__all__"

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]

class MoviesListSerializer(serializers.ModelSerializer):
    movies = MovieSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = MoviesList
        fields = "__all__"

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = "__all__"

class WatchedMovieSerializer(serializers.ModelSerializer):
    movie = MovieSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = WatchedMovie
        fields = ["id", "user", "movie", "watched_at"]
