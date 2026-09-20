import { api } from './api';

export const friendService = {
  getFriends: () => api.get('/friends/'),
  getPending: () => api.get('/friends/pending/'),
  getNotifications: () => api.get('/friends/notifications/'),
  sendRequest: (username) => api.post('/friends/send/', { username }),
  respond: (id, action) => api.post(`/friends/${id}/respond/`, { action }),
  remove: (id) => api.delete(`/friends/${id}/remove/`),
  sendRecommendation: (to_user_id, movie_id, meta = {}) => api.post('/friends/recommend/', { to_user_id, movie_id, ...meta }),
  getRecommendations: () => api.get('/friends/recommendations/'),
  getSentRecommendations: () => api.get('/friends/recommendations/sent/'),
  deleteRecommendation: (id) => api.delete(`/friends/recommendations/${id}/delete/`),
};
