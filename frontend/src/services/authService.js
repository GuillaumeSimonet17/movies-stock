import { api } from './api';

export const authService = {
  login: (credentials) => {
    return api.post('/auth/login/', credentials);
  },

  logout: () => {
    return api.post('/auth/logout/', {});
  },

  signup: (userData) => {
    return api.post('/auth/signup/', userData);
  },

  getCurrentUser: () => {
    return api.get('/auth/user/');
  },

  checkAuth: () => {
    return api.get('/auth/check/');
  },
};
