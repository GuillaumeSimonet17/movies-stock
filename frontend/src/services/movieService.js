import { api } from './api';

export const movieService = {
  getMovies: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/movies/?${params}`);
  },

  search: (query, isTv = false) => {
    return api.get(`/movies/search/?query=${encodeURIComponent(query)}&is_tv=${isTv}`);
  },

  addMovie: (movieId, isTv = false) => {
    return api.post('/movies/add/', { movie_id: movieId, is_tv: isTv });
  },

  getMovieDetail: (id, listId = null) => {
    const qs = listId ? `?list_id=${listId}` : '';
    return api.get(`/movies/${id}/${qs}`);
  },

  deleteMovie: (id) => {
    return api.delete(`/movies/${id}/delete/`);
  },

  getRandomMovie: () => {
    return api.get('/movies/random/');
  },

};
