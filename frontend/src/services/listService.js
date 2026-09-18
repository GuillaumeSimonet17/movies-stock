import { api } from './api';

export const listService = {
  getLists: () => api.get('/lists/'),

  createList: (name) => api.post('/lists/create/', { name }),

  getList: (id) => api.get(`/lists/${id}/`),

  renameList: (id, name) => api.put(`/lists/${id}/`, { name }),

  updateList: (id, data) => api.put(`/lists/${id}/`, data),

  deleteList: (id) => api.delete(`/lists/${id}/`),

  addMovie: (listId, movieId) => api.post(`/lists/${listId}/add/`, { movie_id: movieId }),

  removeMovie: (listId, movieId) => api.delete(`/lists/${listId}/movies/${movieId}/delete/`),

  searchAdd: (listId, tmdbId, isTv = false) =>
    api.post(`/lists/${listId}/search-add/`, { tmdb_id: tmdbId, is_tv: isTv }),

  getWatchedCount: () => api.get('/watched/count/'),
};
