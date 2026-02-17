import {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import TopBar from '../components/common/TopBar';
import SearchBar from '../components/movies/SearchBar';
import Filters from '../components/movies/Filters';
import MovieCard from '../components/common/MovieCard';
import {movieService} from '../services/movieService';
import {getGenreName} from '../utils/genreMapping';
import './Home.css';

function Home() {
  const [movies, setMovies] = useState([]);
  const [groupedMovies, setGroupedMovies] = useState({});
  const [loading, setLoading] = useState(true);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [filters, setFilters] = useState({
    genre: 'all',
    is_tv: 'all',
    order_by: '-release_date',
    search: ''
  });
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      loadMovies();
    }, filters.search ? 400 : 0);

    return () => clearTimeout(debounceRef.current);
  }, [filters]);


  const loadMovies = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.genre && filters.genre !== 'all') {
        params.genre = filters.genre;
      }
      if (filters.is_tv && filters.is_tv !== 'all') {
        params.is_tv = filters.is_tv;
      }
      if (filters.order_by) {
        params.order_by = filters.order_by;
      }
      if (filters.search && filters.search.trim() !== '') {
        params.search = filters.search;
      }
      const data = await movieService.getMovies(params);

      // Safety checks for API response
      const moviesData = Array.isArray(data?.movies) ? data.movies : [];
      const groupedData = data?.grouped_by_genre && typeof data.grouped_by_genre === 'object'
        ? data.grouped_by_genre
        : {};

      setMovies(moviesData);
      setGroupedMovies(groupedData);
      const genres = Array.isArray(data?.available_genres)
        ? data.available_genres.map(name => ({id: name, name}))
        : [];

      setAvailableGenres(genres);

    } catch (error) {
      console.error('Error loading movies:', error);
      // Set empty states on error
      setMovies([]);
      setGroupedMovies({});
      setAvailableGenres([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleRandomMovie = async () => {
    try {
      const movie = await movieService.getRandomMovie();
      navigate(`/movie/${movie.id}`);
    } catch (error) {
      console.error('Error getting random movie:', error);
    }
  };

  if (loading) {
    return (
      <div className="home-page">
        <TopBar/>
        <div className="loading-container">
          <div className="loading">Loading your collection...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <TopBar/>

      <div className="content">
        <SearchBar onMovieAdded={loadMovies}/>

        <div className="actions-row">
          <Filters
            onFilterChange={handleFilterChange}
            availableGenres={availableGenres}
            currentFilters={filters}
          />
          <button className="random-btn" onClick={handleRandomMovie}>
            🎲
          </button>
        </div>

        {movies.length === 0 ? (
          <div className="empty-state">
            <h2>Welcome to Hollylist!</h2>
            <p>Your movie collection is empty.</p>
            <p>Search and add some movies above to get started.</p>
          </div>
        ) : (
          <div className="movies-container">
            {Object.entries(groupedMovies)
              .filter(([_, genreMovies]) => {
                // Filter out empty or invalid genre groups
                return Array.isArray(genreMovies) && genreMovies.length > 0;
              })
              .sort(([keyA], [keyB]) => {
                // Always put "Latest" first
                const keyALower = String(keyA).toLowerCase();
                const keyBLower = String(keyB).toLowerCase();

                if (keyALower === "latest") return -1;
                if (keyBLower === "latest") return 1;

                // Get genre names for sorting
                const nameA = getGenreName(keyA);
                const nameB = getGenreName(keyB);

                return nameA.localeCompare(nameB);
              })
              .map(([genreKey, genreMovies]) => (
                <div key={genreKey} className="genre-section">
                  <h3 className="genre-title">
                    {getGenreName(genreKey)}
                  </h3>

                  <div className="slider-wrapper">
                    <div className="genre-slider">
                      {genreMovies.map(movie => (
                        <MovieCard key={movie?.id || Math.random()} movie={movie} movieList={genreMovies}/>
                      ))}
                    </div>

                    <button
                      className="slider-btn prev"
                      onClick={(e) => {
                        const slider = e.currentTarget.parentElement.querySelector('.genre-slider');
                        slider.scrollBy({left: -600, behavior: 'smooth'});
                      }}
                    >
                      ‹
                    </button>

                    <button
                      className="slider-btn next"
                      onClick={(e) => {
                        const slider = e.currentTarget.parentElement.querySelector('.genre-slider');
                        slider.scrollBy({left: 600, behavior: 'smooth'});
                      }}
                    >
                      ›
                    </button>
                  </div>

                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
