from unittest.mock import AsyncMock, patch

from claude_agent_sdk import ResultMessage
from django.core.cache import cache
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from msapp.models import Movie, MoviesList, MovieListItem, WatchedMovie
from msapp.api.views.ai_views import AssistantError, MovieSelection, select_movies as real_select_movies


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

import itertools
_movie_counter = itertools.count(1)

def make_movie(**kwargs):
    defaults = dict(
        title='Test Movie',
        poster_path='/poster.jpg',
        status='Released',
        dominant_color='#111111',
        movie_id=next(_movie_counter),
    )
    defaults.update(kwargs)
    return Movie.objects.create(**defaults)


def make_user(username='user1', password='pass'):
    return User.objects.create_user(username=username, password=password)


def make_collection(user):
    lst, _ = MoviesList.objects.get_or_create(
        user=user, is_collection=True,
        defaults={'name': f"{user.username}'s list"}
    )
    return lst


def make_custom_list(user, name='My List'):
    return MoviesList.objects.create(user=user, name=name, is_collection=False)


def add_to_list(lst, movie):
    return MovieListItem.objects.create(movies_list=lst, movie=movie)


# ---------------------------------------------------------------------------
# List CRUD
# ---------------------------------------------------------------------------

class ListCRUDTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_list(self):
        r = self.client.post('/api/lists/create/', {'name': 'Favourites'})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data['name'], 'Favourites')
        self.assertEqual(r.data['count'], 0)
        self.assertTrue(MoviesList.objects.filter(
            user=self.user, name='Favourites', is_collection=False
        ).exists())

    def test_create_list_empty_name_rejected(self):
        r = self.client.post('/api/lists/create/', {'name': '   '})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_user_lists_excludes_collection(self):
        make_collection(self.user)
        make_custom_list(self.user, 'A')
        make_custom_list(self.user, 'B')
        r = self.client.get('/api/lists/')
        self.assertEqual(r.status_code, 200)
        names = [l['name'] for l in r.data]
        self.assertIn('A', names)
        self.assertIn('B', names)
        self.assertNotIn(f"{self.user.username}'s list", names)

    def test_rename_list(self):
        lst = make_custom_list(self.user, 'Old Name')
        r = self.client.put(f'/api/lists/{lst.id}/', {'name': 'New Name'})
        self.assertEqual(r.status_code, 200)
        lst.refresh_from_db()
        self.assertEqual(lst.name, 'New Name')

    def test_rename_list_empty_name_rejected(self):
        lst = make_custom_list(self.user)
        r = self.client.put(f'/api/lists/{lst.id}/', {'name': ''})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_list(self):
        lst = make_custom_list(self.user)
        r = self.client.delete(f'/api/lists/{lst.id}/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MoviesList.objects.filter(id=lst.id).exists())

    def test_delete_list_removes_its_items_only(self):
        col = make_collection(self.user)
        custom = make_custom_list(self.user, 'ToDelete')
        movie = make_movie()
        add_to_list(col, movie)
        add_to_list(custom, movie)
        self.client.delete(f'/api/lists/{custom.id}/')
        # movie still in collection
        self.assertTrue(MovieListItem.objects.filter(movies_list=col, movie=movie).exists())

    def test_cannot_access_other_users_list(self):
        other = make_user('other')
        lst = make_custom_list(other, 'Private')
        r = self.client.get(f'/api/lists/{lst.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_rename_other_users_list(self):
        other = make_user('other')
        lst = make_custom_list(other, 'Private')
        r = self.client.put(f'/api/lists/{lst.id}/', {'name': 'Hacked'})
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        lst.refresh_from_db()
        self.assertEqual(lst.name, 'Private')

    def test_cannot_delete_other_users_list(self):
        other = make_user('other')
        lst = make_custom_list(other, 'Private')
        r = self.client.delete(f'/api/lists/{lst.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(MoviesList.objects.filter(id=lst.id).exists())

    def test_unauthenticated_blocked(self):
        client = APIClient()
        r = client.get('/api/lists/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_count_reflects_items(self):
        lst = make_custom_list(self.user)
        m1 = make_movie()
        m2 = make_movie(movie_id=2)
        add_to_list(lst, m1)
        add_to_list(lst, m2)
        r = self.client.get('/api/lists/')
        entry = next(l for l in r.data if l['id'] == lst.id)
        self.assertEqual(entry['count'], 2)


# ---------------------------------------------------------------------------
# List isolation — add / remove
# ---------------------------------------------------------------------------

class ListIsolationTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.collection = make_collection(self.user)
        self.custom = make_custom_list(self.user, 'Custom')
        self.movie = make_movie(title='Amelie')

    def test_add_to_custom_does_not_touch_collection(self):
        add_to_list(self.collection, self.movie)
        r = self.client.post(f'/api/lists/{self.custom.id}/add/', {'movie_id': self.movie.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())

    def test_add_to_collection_does_not_touch_custom(self):
        add_to_list(self.custom, self.movie)
        other = make_movie(title='Gravity')
        add_to_list(self.collection, other)
        self.assertEqual(self.custom.list_items.count(), 1)
        self.assertEqual(self.custom.list_items.first().movie, self.movie)

    def test_remove_from_custom_does_not_touch_collection(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        r = self.client.delete(f'/api/lists/{self.custom.id}/movies/{self.movie.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())

    def test_remove_from_collection_does_not_touch_custom(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        r = self.client.delete(f'/api/lists/{self.collection.id}/movies/{self.movie.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())

    def test_two_custom_lists_independent(self):
        other_custom = make_custom_list(self.user, 'Other')
        add_to_list(self.custom, self.movie)
        add_to_list(other_custom, self.movie)
        self.client.delete(f'/api/lists/{self.custom.id}/movies/{self.movie.id}/delete/')
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=other_custom, movie=self.movie).exists())

    def test_duplicate_add_rejected(self):
        add_to_list(self.custom, self.movie)
        r = self.client.post(f'/api/lists/{self.custom.id}/add/', {'movie_id': self.movie.id})
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)

    def test_remove_nonexistent_returns_404(self):
        r = self.client.delete(f'/api/lists/{self.custom.id}/movies/{self.movie.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_movie_not_deleted_from_db_if_still_in_other_list(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        self.client.delete(f'/api/lists/{self.collection.id}/movies/{self.movie.id}/delete/')
        self.assertTrue(Movie.objects.filter(id=self.movie.id).exists())

    def test_orphaned_movie_deleted_from_db_when_removed_from_collection(self):
        add_to_list(self.collection, self.movie)
        self.client.delete(f'/api/lists/{self.collection.id}/movies/{self.movie.id}/delete/')
        self.assertFalse(Movie.objects.filter(id=self.movie.id).exists())

    def test_orphaned_movie_not_deleted_from_db_when_removed_from_custom(self):
        # Removing from custom list never deletes the Movie row
        add_to_list(self.custom, self.movie)
        self.client.delete(f'/api/lists/{self.custom.id}/movies/{self.movie.id}/delete/')
        self.assertTrue(Movie.objects.filter(id=self.movie.id).exists())

    def test_watched_movie_not_deleted_from_db_even_if_removed_from_all_lists(self):
        add_to_list(self.collection, self.movie)
        WatchedMovie.objects.create(user=self.user, movie=self.movie)
        self.client.delete(f'/api/lists/{self.collection.id}/movies/{self.movie.id}/delete/')
        self.assertTrue(Movie.objects.filter(id=self.movie.id).exists())

    def test_get_list_detail_only_shows_its_movies(self):
        other_custom = make_custom_list(self.user, 'Other')
        m1 = make_movie(title='M1')
        m2 = make_movie(title='M2')
        add_to_list(self.custom, m1)
        add_to_list(other_custom, m2)
        r = self.client.get(f'/api/lists/{self.custom.id}/')
        ids = [m['id'] for m in r.data['movies']]
        self.assertIn(m1.id, ids)
        self.assertNotIn(m2.id, ids)


# ---------------------------------------------------------------------------
# Seen (add to watched)
# ---------------------------------------------------------------------------

class SeenTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.collection = make_collection(self.user)
        self.custom = make_custom_list(self.user, 'Custom')
        self.movie = make_movie(title='Amelie')

    def test_seen_from_collection_removes_only_from_collection(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        r = self.client.post('/api/watched/add/', {
            'movie_id': self.movie.id,
            'list_id': self.collection.id,
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())
        self.assertTrue(WatchedMovie.objects.filter(user=self.user, movie=self.movie).exists())

    def test_seen_from_custom_removes_only_from_custom(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        r = self.client.post('/api/watched/add/', {
            'movie_id': self.movie.id,
            'list_id': self.custom.id,
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())
        self.assertTrue(WatchedMovie.objects.filter(user=self.user, movie=self.movie).exists())

    def test_seen_without_list_id_removes_from_collection_by_default(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        r = self.client.post('/api/watched/add/', {'movie_id': self.movie.id})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())

    def test_seen_twice_returns_conflict(self):
        add_to_list(self.collection, self.movie)
        self.client.post('/api/watched/add/', {'movie_id': self.movie.id, 'list_id': self.collection.id})
        r = self.client.post('/api/watched/add/', {'movie_id': self.movie.id, 'list_id': self.collection.id})
        self.assertEqual(r.status_code, status.HTTP_409_CONFLICT)

    def test_seen_with_other_users_list_id_does_not_affect_that_list(self):
        other = make_user('other')
        other_custom = make_custom_list(other, 'Hack')
        add_to_list(other_custom, self.movie)
        add_to_list(self.collection, self.movie)
        # Pass another user's list_id — should not remove from that list
        self.client.post('/api/watched/add/', {
            'movie_id': self.movie.id,
            'list_id': other_custom.id,
        })
        self.assertTrue(MovieListItem.objects.filter(movies_list=other_custom, movie=self.movie).exists())

    def test_seen_from_two_custom_lists_same_movie(self):
        custom2 = make_custom_list(self.user, 'Custom2')
        add_to_list(self.custom, self.movie)
        add_to_list(custom2, self.movie)
        # Mark seen from custom (removes from custom only)
        self.client.post('/api/watched/add/', {
            'movie_id': self.movie.id,
            'list_id': self.custom.id,
        })
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=custom2, movie=self.movie).exists())


# ---------------------------------------------------------------------------
# Nope (remove via /api/lists/<id>/movies/<id>/delete/)
# ---------------------------------------------------------------------------

class NopeTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.collection = make_collection(self.user)
        self.custom = make_custom_list(self.user, 'Custom')
        self.movie = make_movie(title='Amelie')

    def test_nope_from_collection_does_not_touch_custom(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        r = self.client.delete(f'/api/lists/{self.collection.id}/movies/{self.movie.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())

    def test_nope_from_custom_does_not_touch_collection(self):
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, self.movie)
        r = self.client.delete(f'/api/lists/{self.custom.id}/movies/{self.movie.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.collection, movie=self.movie).exists())
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())

    def test_nope_from_one_custom_does_not_touch_other_custom(self):
        custom2 = make_custom_list(self.user, 'Custom2')
        add_to_list(self.custom, self.movie)
        add_to_list(custom2, self.movie)
        self.client.delete(f'/api/lists/{self.custom.id}/movies/{self.movie.id}/delete/')
        self.assertFalse(MovieListItem.objects.filter(movies_list=self.custom, movie=self.movie).exists())
        self.assertTrue(MovieListItem.objects.filter(movies_list=custom2, movie=self.movie).exists())

    def test_cannot_nope_from_other_users_list(self):
        other = make_user('other')
        other_col = make_collection(other)
        add_to_list(other_col, self.movie)
        r = self.client.delete(f'/api/lists/{other_col.id}/movies/{self.movie.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(MovieListItem.objects.filter(movies_list=other_col, movie=self.movie).exists())


# ---------------------------------------------------------------------------
# Movie detail access control
# ---------------------------------------------------------------------------

class MovieDetailAccessTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.collection = make_collection(self.user)
        self.custom = make_custom_list(self.user, 'Custom')
        self.movie = make_movie(title='Amelie', dominant_color='#123456')

    def test_access_movie_in_collection(self):
        add_to_list(self.collection, self.movie)
        r = self.client.get(f'/api/movies/{self.movie.id}/')
        self.assertEqual(r.status_code, 200)

    def test_access_movie_in_custom_list_only(self):
        add_to_list(self.custom, self.movie)
        r = self.client.get(f'/api/movies/{self.movie.id}/')
        self.assertEqual(r.status_code, 200)

    def test_no_access_if_movie_not_in_any_list(self):
        r = self.client.get(f'/api/movies/{self.movie.id}/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_access_to_other_users_movie(self):
        other = make_user('other')
        other_col = make_collection(other)
        add_to_list(other_col, self.movie)
        r = self.client.get(f'/api/movies/{self.movie.id}/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_detail_with_list_id_filters_navigation_to_that_list(self):
        m2 = make_movie(title='Gravity', dominant_color='#654321')
        add_to_list(self.collection, self.movie)
        add_to_list(self.custom, m2)
        # Request detail scoped to collection
        r = self.client.get(f'/api/movies/{self.movie.id}/?list_id={self.collection.id}')
        self.assertEqual(r.status_code, 200)
        self.assertIn(self.movie.id, r.data['movies_list'])
        self.assertNotIn(m2.id, r.data['movies_list'])

    def test_detail_without_list_id_falls_back_to_collection(self):
        m2 = make_movie(title='Gravity', dominant_color='#654321')
        add_to_list(self.collection, self.movie)
        add_to_list(self.collection, m2)
        add_to_list(self.custom, make_movie(title='Other', dominant_color='#000000'))
        r = self.client.get(f'/api/movies/{self.movie.id}/')
        self.assertIn(m2.id, r.data['movies_list'])


# ---------------------------------------------------------------------------
# Watched count
# ---------------------------------------------------------------------------

class WatchedCountTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_count_zero_initially(self):
        r = self.client.get('/api/watched/count/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 0)

    def test_count_increments(self):
        movie = make_movie()
        WatchedMovie.objects.create(user=self.user, movie=movie)
        r = self.client.get('/api/watched/count/')
        self.assertEqual(r.data['count'], 1)

    def test_count_isolated_per_user(self):
        other = make_user('other')
        movie = make_movie()
        WatchedMovie.objects.create(user=other, movie=movie)
        r = self.client.get('/api/watched/count/')
        self.assertEqual(r.data['count'], 0)

    def test_unauthenticated_blocked(self):
        r = APIClient().get('/api/watched/count/')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Cross-user isolation
# ---------------------------------------------------------------------------

class CrossUserIsolationTests(TestCase):
    def setUp(self):
        self.user1 = make_user('user1')
        self.user2 = make_user('user2')
        self.col1 = make_collection(self.user1)
        self.col2 = make_collection(self.user2)
        self.movie = make_movie(title='Shared Movie')
        add_to_list(self.col1, self.movie)
        add_to_list(self.col2, self.movie)
        self.client1 = APIClient()
        self.client1.force_authenticate(self.user1)

    def test_user1_seen_does_not_affect_user2_collection(self):
        self.client1.post('/api/watched/add/', {
            'movie_id': self.movie.id,
            'list_id': self.col1.id,
        })
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.col2, movie=self.movie).exists())

    def test_user1_nope_does_not_affect_user2_collection(self):
        self.client1.delete(f'/api/lists/{self.col1.id}/movies/{self.movie.id}/delete/')
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.col2, movie=self.movie).exists())

    def test_user1_cannot_read_user2_custom_list(self):
        custom2 = make_custom_list(self.user2, 'Private')
        r = self.client1.get(f'/api/lists/{custom2.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_user1_cannot_delete_user2_custom_list(self):
        custom2 = make_custom_list(self.user2, 'Private')
        r = self.client1.delete(f'/api/lists/{custom2.id}/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(MoviesList.objects.filter(id=custom2.id).exists())

    def test_user1_get_lists_only_sees_own(self):
        make_custom_list(self.user1, 'Mine')
        make_custom_list(self.user2, 'NotMine')
        r = self.client1.get('/api/lists/')
        names = [l['name'] for l in r.data]
        self.assertIn('Mine', names)
        self.assertNotIn('NotMine', names)

    def test_user1_cannot_add_movie_to_user2_list(self):
        custom2 = make_custom_list(self.user2, 'Private')
        r = self.client1.post(f'/api/lists/{custom2.id}/add/', {'movie_id': self.movie.id})
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(MovieListItem.objects.filter(movies_list=custom2, movie=self.movie).exists())

    def test_user1_cannot_remove_movie_from_user2_list(self):
        r = self.client1.delete(f'/api/lists/{self.col2.id}/movies/{self.movie.id}/delete/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(MovieListItem.objects.filter(movies_list=self.col2, movie=self.movie).exists())


# ---------------------------------------------------------------------------
# Ask Claude
# ---------------------------------------------------------------------------

class AskMoviesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.collection = make_collection(self.user)
        self.movie = make_movie(title='Fight Club', actors='Brad Pitt', genre_ids=[{'id': 18, 'name': 'Drama'}])
        add_to_list(self.collection, self.movie)

    def ask(self, query='Un film avec Brad Pitt'):
        return self.client.post('/api/movies/ask/', {'query': query}, format='json')

    def claude_selects(self, select_movies, movie_ids, message='Voici ta sélection.'):
        select_movies.return_value = MovieSelection(movie_ids=movie_ids, message=message)

    @patch('msapp.api.views.ai_views.select_movies')
    def test_returns_selected_movies_in_order(self, select_movies):
        other = make_movie(title='Se7en')
        add_to_list(self.collection, other)
        self.claude_selects(select_movies, [other.id, self.movie.id])
        r = self.ask()
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual([m['id'] for m in r.data['movies']], [other.id, self.movie.id])
        self.assertEqual(r.data['message'], 'Voici ta sélection.')
        self.assertEqual(r.data['list_id'], self.collection.id)

    @patch('msapp.api.views.ai_views.select_movies')
    def test_catalog_only_contains_user_collection(self, select_movies):
        foreign = make_movie(title='Film of another user')
        add_to_list(make_collection(make_user('user2')), foreign)
        custom = make_movie(title='Film of a custom list')
        add_to_list(make_custom_list(self.user), custom)
        self.claude_selects(select_movies, [])
        self.ask()
        catalog, query = select_movies.call_args.args
        self.assertIn('Fight Club', catalog)
        self.assertIn('Brad Pitt', catalog)
        self.assertNotIn('Film of another user', catalog)
        self.assertNotIn('Film of a custom list', catalog)
        self.assertEqual(query, 'Un film avec Brad Pitt')

    @patch('msapp.api.views.ai_views.select_movies')
    def test_ignores_ids_outside_collection_and_duplicates(self, select_movies):
        foreign = make_movie(title='Film of another user')
        self.claude_selects(select_movies, [foreign.id, self.movie.id, self.movie.id, 999999])
        r = self.ask()
        self.assertEqual([m['id'] for m in r.data['movies']], [self.movie.id])

    @patch('msapp.api.views.ai_views.select_movies')
    def test_invalid_queries_are_rejected_without_calling_claude(self, select_movies):
        for query in ['', '   ', 'x' * 301, 42]:
            self.assertEqual(self.ask(query).status_code, status.HTTP_400_BAD_REQUEST)
        select_movies.assert_not_called()

    @patch('msapp.api.views.ai_views.select_movies')
    def test_empty_collection_does_not_call_claude(self, select_movies):
        MovieListItem.objects.filter(movies_list=self.collection).delete()
        r = self.ask()
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['movies'], [])
        select_movies.assert_not_called()

    @patch('msapp.api.views.ai_views.select_movies')
    def test_assistant_error_is_returned(self, select_movies):
        select_movies.side_effect = AssistantError('Indisponible', status.HTTP_503_SERVICE_UNAVAILABLE)
        r = self.ask()
        self.assertEqual(r.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(r.data['error'], 'Indisponible')

    def claude_result(self, **kwargs):
        defaults = dict(
            subtype='success', duration_ms=1, duration_api_ms=1, is_error=False,
            num_turns=1, session_id='s', structured_output={'movie_ids': [1], 'message': 'ok'},
        )
        defaults.update(kwargs)
        return ResultMessage(**defaults)

    def select_with_result(self, result):
        with patch('msapp.api.views.ai_views.run_claude', new=AsyncMock(return_value=result)):
            return real_select_movies('1 | Fight Club', 'Un film')

    def assert_select_fails(self, result, status_code):
        with self.assertRaises(AssistantError) as ctx:
            self.select_with_result(result)
        self.assertEqual(ctx.exception.status_code, status_code)

    def test_select_movies_parses_structured_output(self):
        selection = self.select_with_result(self.claude_result())
        self.assertEqual(selection.movie_ids, [1])

    def test_select_movies_maps_failures(self):
        self.assert_select_fails(None, status.HTTP_502_BAD_GATEWAY)
        self.assert_select_fails(self.claude_result(structured_output=None), status.HTTP_502_BAD_GATEWAY)
        self.assert_select_fails(
            self.claude_result(is_error=True, result="You've hit your usage limit"),
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
        self.assert_select_fails(
            self.claude_result(is_error=True, result='Invalid token, please run /login'),
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    @patch('msapp.api.views.ai_views.select_movies')
    def test_questions_are_throttled(self, select_movies):
        self.claude_selects(select_movies, [])
        for _ in range(30):
            self.assertEqual(self.ask().status_code, status.HTTP_200_OK)
        self.assertEqual(self.ask().status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_requires_authentication(self):
        r = APIClient().post('/api/movies/ask/', {'query': 'Un film'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
