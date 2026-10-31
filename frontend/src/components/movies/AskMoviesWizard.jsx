import {useState, useEffect} from 'react';
import MovieCard from '../common/MovieCard';
import {movieService} from '../../services/movieService';
import './AskMoviesWizard.css';

const EXAMPLES = [
  'un film de braquage',
  'un film drôle avec Brad Pitt',
  "un Tarantino d'avant 2010",
  'un film spécial Noël',
];

function AskMoviesWizard({onClose, onMovieAdded}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addStatus, setAddStatus] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const ask = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setQuery(text);
    setLoading(true);
    setError('');
    setResult(null);
    setAddStatus({});
    try {
      setResult(await movieService.askMovies(trimmed));
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (movie) => {
    setAddStatus(prev => ({...prev, [movie.movie_id]: 'adding'}));
    try {
      await movieService.addMovie(movie.movie_id, movie.is_tv);
      setAddStatus(prev => ({...prev, [movie.movie_id]: 'added'}));
      onMovieAdded();
    } catch {
      setAddStatus(prev => ({...prev, [movie.movie_id]: 'error'}));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    ask(query);
  };

  return (
    <div className="ask-overlay" onClick={onClose}>
      <div
        className="ask-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-wizard-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ask-header">
          <h2 id="ask-wizard-title">Demander a Claude</h2>
          <button className="ask-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form className="ask-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Je cherche..."
            maxLength={300}
            aria-label="Décris le film que tu cherches"
            autoFocus
          />
          <button type="submit" disabled={loading || !query.trim()}>
            Chercher
          </button>
        </form>

        {!result && !loading && !error && (
          <div className="ask-examples">
            {EXAMPLES.map(example => (
              <button key={example} type="button" onClick={() => ask(example)}>
                {example}
              </button>
            ))}
          </div>
        )}

        {loading && <p className="ask-status">Je fouille ta liste...</p>}
        {error && <p className="ask-status ask-error">{error}</p>}

        {result && (
          <>
            <p className="ask-status">{result.message}</p>
            <div className="ask-results">
              {result.movies.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  movieList={result.movies}
                  from="home"
                  extraState={{sourceListId: result.list_id}}
                />
              ))}
            </div>

            {result.suggestions.length > 0 && (
              <>
                <h3 className="ask-section-title">Pas encore dans ta liste</h3>
                <div className="ask-results">
                  {result.suggestions.map(movie => (
                    <div key={movie.movie_id} className="ask-suggestion">
                      <MovieCard movie={movie} clickable={false} from="home"/>
                      {addStatus[movie.movie_id] === 'added' ? (
                        <span className="ask-added">✓ Dans ma liste</span>
                      ) : (
                        <button
                          type="button"
                          disabled={addStatus[movie.movie_id] === 'adding'}
                          onClick={() => handleAdd(movie)}
                        >
                          {addStatus[movie.movie_id] === 'adding' && 'Ajout...'}
                          {addStatus[movie.movie_id] === 'error' && 'Échec, réessayer'}
                          {!addStatus[movie.movie_id] && '+ Ajouter'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AskMoviesWizard;
