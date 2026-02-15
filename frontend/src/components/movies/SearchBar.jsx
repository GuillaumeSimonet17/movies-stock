import {useState, useEffect} from 'react';
import {movieService} from '../../services/movieService';
import './SearchBar.css';

function SearchBar({onMovieAdded}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('movie');
  const [adding, setAdding] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await movieService.search(query, searchType === 'tv');
        setResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchType]);

  const handleAddMovie = async (movie) => {
    setAdding(movie.id);
    try {
      await movieService.addMovie(movie.id, searchType === 'tv');
      setQuery('');
      setResults([]);
      if (onMovieAdded) onMovieAdded();
    } catch (error) {
      console.error('Add movie error:', error);
      setErrorMsg(error.message || 'Failed to add movie');
    } finally {
      setAdding(null);
    }
  };

  useEffect(() => {
    if (!errorMsg) return;

    const timer = setTimeout(() => {
      setErrorMsg(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [errorMsg]);

  return (
    <div className="search-bar">
      {errorMsg}
      <div className="search-controls col-12 col-md-6">
        <input
          type="text"
          placeholder="Search for movies or TV shows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />

        <div className="search-type-toggle">
          <button
            className={searchType === 'movie' ? 'active' : ''}
            onClick={() => setSearchType('movie')}
          >
            Movies
          </button>
          <button
            className={searchType === 'tv' ? 'active' : ''}
            onClick={() => setSearchType('tv')}
          >
            Series
          </button>
        </div>
      </div>

      {loading && <div className="search-loading">Searching...</div>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((movie) => (
            <div key={movie.id} className="search-result-item col-1" onClick={() => handleAddMovie(movie)}>
              {movie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title || movie.name}
                />
              )}
              <div className="result-info">
                <span>{adding === movie.id ? 'Adding...' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
