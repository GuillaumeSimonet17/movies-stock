import { api } from './api';

export const watchedService = {
  getWatchedMovies: (groupBy = 'all') => {
    return api.get(`/watched/?group_by=${groupBy}`);
  },

  addToWatched: (movieId) => {
    return api.post('/watched/add/', { movie_id: movieId });
  },

  removeFromWatched: (movieId) => {
    return api.delete(`/watched/${movieId}/delete/`);
  },

  getStats: () => {
    return api.get('/watched/stats/');
  },
};
