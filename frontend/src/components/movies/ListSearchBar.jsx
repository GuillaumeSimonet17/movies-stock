import { useState, useEffect } from 'react';
import { movieService } from '../../services/movieService';
import { listService } from '../../services/listService';
import './SearchBar.css';

function ListSearchBar({ listId, onMovieAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('movie');
  const [adding, setAdding] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await movieService.search(query, searchType === 'tv');
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, searchType]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const handleAdd = async (movie) => {
    setAdding(movie.id);
    try {
      const added = await listService.searchAdd(listId, movie.id, searchType === 'tv');
      setQuery('');
      setResults([]);
      if (onMovieAdded) onMovieAdded(added);
    } catch (err) {
      const msg = err?.message?.toLowerCase().includes('already') ? 'Déjà dans cette liste' : "Impossible d'ajouter le film";
      setErrorMsg(msg);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="search-bar">
      {errorMsg && <div style={{ color: 'red', marginBottom: 6, textAlign: 'center' }}>{errorMsg}</div>}
      <div className="search-controls col-12 col-md-6">
        <input
          type="text"
          placeholder={searchType === 'tv' ? 'Rechercher et ajouter une série...' : 'Rechercher et ajouter un film...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="search-input"
        />
        <div className="search-type-toggle">
          <button className={searchType === 'movie' ? 'active' : ''} onClick={() => setSearchType('movie')}>
            Films
          </button>
          <button className={searchType === 'tv' ? 'active' : ''} onClick={() => setSearchType('tv')}>
            Séries
          </button>
        </div>
      </div>

      {loading && <div className="search-loading">Recherche...</div>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map(movie => (
            <div
              key={movie.id}
              className="search-result-item col-6 col-md-1 d-flex flex-column"
              onClick={() => handleAdd(movie)}
            >
              {movie.poster_path && (
                <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title || movie.name} />
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

export default ListSearchBar;
