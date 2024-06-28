from django.shortcuts import render
from django.http import JsonResponse
import requests


def home(request):
    movies = [
        {'title': 'Inception', 'year': 2010},
        {'title': 'The Matrix', 'year': 1999},
        {'title': 'Interstellar', 'year': 2014},
    ]
    values = {
        'movies': movies,
    }
    return render(request, 'home.html', values)

def search_movies(request):
    if request.method == 'GET' and 'query' in request.GET:
        query = request.GET.get('query')
        if query:
            api_key = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MTA2MjRmYjZmOGNkMGEzMjc5YTk4ZmJhZDBkYTA4ZCIsIm5iZiI6MTcxOTYxNTIyNi42MTcyMzksInN1YiI6IjYyMTNhNzJkODEzODMxMDAxYzYxN2Q2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.KHP_u0H2ra2mASaXmyeiEX-qQiyCfhCK_HSeNbDvyn8'
            url = f'https://api.themoviedb.org/3/search/movie?query={query}'
            headers = {
                'accept': 'application/json',
                "Authorization": "Bearer "+api_key,
            }
            try:
                response = requests.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                results = data.get('results', [])
                return JsonResponse(data)

            except requests.exceptions.RequestException as e:
                print(f"Error fetching data from TMDb API: {e}")
    return JsonResponse(data)

