import { api } from './api';

export const watchedService = {
  getWatchedMovies: (groupBy = 'all') => {
    return api.get(`/watched/?group_by=${groupBy}`);
  },

  addToWatched: (movieId, listId = null) => {
    const body = { movie_id: movieId };
    if (listId) body.list_id = listId;
    return api.post('/watched/add/', body);
  },

  removeFromWatched: (movieId) => {
    return api.delete(`/watched/${movieId}/delete/`);
  },

  getStats: () => {
    return api.get('/watched/stats/');
  },
};
