import {useState, useEffect} from 'react';
import TopBar from '../components/common/TopBar';
import MovieCard from '../components/common/MovieCard';
import {watchedService} from '../services/watchedService';
import './WatchedPage.css';

function WatchedPage() {
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [groupedWatched, setGroupedWatched] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [groupBy, setGroupBy] = useState('all');
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [movieToRemove, setMovieToRemove] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    loadWatchedMovies();
  }, [groupBy]);

  const loadWatchedMovies = async () => {
    setLoading(true);
    try {
      const data = await watchedService.getWatchedMovies(groupBy);
      setWatchedMovies(data.watched_movies || []);
      setGroupedWatched(data.grouped_watched || {});
      setTotalCount(data.total_count || 0);
    } catch (error) {
      console.error('Error loading watched movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleRemoveClick = (watchedMovie) => {
    setMovieToRemove(watchedMovie);
    setShowConfirmDialog(true);
  };

  const handleConfirmRemove = async () => {
    if (!movieToRemove) return;

    const movieId = movieToRemove.movie.id;
    const watchedId = movieToRemove.id;

    // Close dialog
    setShowConfirmDialog(false);

    // Mark as removing for visual feedback
    setRemovingIds(prev => new Set(prev).add(watchedId));

    // Optimistic UI update
    const previousWatchedMovies = [...watchedMovies];
    const previousGroupedWatched = {...groupedWatched};
    const previousCount = totalCount;

    // Remove from state immediately
    setWatchedMovies(prev => prev.filter(w => w.id !== watchedId));
    setTotalCount(prev => prev - 1);

    // Update grouped data
    if (groupBy !== 'all') {
      const updatedGrouped = {...groupedWatched};
      for (const [period, group] of Object.entries(updatedGrouped)) {
        updatedGrouped[period] = {
          ...group,
          movies: group.movies.filter(w => w.id !== watchedId),
          count: group.movies.filter(w => w.id !== watchedId).length
        };
        // Remove empty groups
        if (updatedGrouped[period].count === 0) {
          delete updatedGrouped[period];
        }
      }
      setGroupedWatched(updatedGrouped);
    }

    try {
      // Call API to remove from backend
      await watchedService.removeFromWatched(movieId);
      showToast('Film retiré de la liste', 'success');
    } catch (error) {
      console.error('Error removing movie:', error);
      // Rollback on error
      setWatchedMovies(previousWatchedMovies);
      setGroupedWatched(previousGroupedWatched);
      setTotalCount(previousCount);
      showToast('Erreur, veuillez réessayer.', 'error');
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(watchedId);
        return newSet;
      });
      setMovieToRemove(null);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmDialog(false);
    setMovieToRemove(null);
  };

  if (loading) {
    return (
      <div className="watched-page">
        <TopBar/>
        <div className="loading-container">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="watched-page">
      <TopBar/>

      <div className="content">
        <div className="watched-header">
          <h1>Films vus</h1>
        </div>

        <div className="grouping-controls">
          <button
            className={groupBy === 'all' ? 'active' : ''}
            onClick={() => setGroupBy('all')}
          >
            Tous
          </button>
          <button
            className={groupBy === 'year' ? 'active' : ''}
            onClick={() => setGroupBy('year')}
          >
            Par année
          </button>
          <button
            className={groupBy === 'month' ? 'active' : ''}
            onClick={() => setGroupBy('month')}
          >
            Par mois
          </button>
          <button
            className={groupBy === 'week' ? 'active' : ''}
            onClick={() => setGroupBy('week')}
          >
            Par semaine
          </button>
        </div>

        {totalCount === 0 ? (
          <div className="empty-state">
            <h2>Aucun film vu pour l'instant</h2>
            <p>Les films que vous marquez comme vus apparaîtront ici.</p>
          </div>
        ) : groupBy === 'all' ? (
          <div className="movies-wrap">
            {watchedMovies.map((watched) => (
              <div
                key={watched.id}
                className={`watched-movie-item ${removingIds.has(watched.id) ? 'removing' : ''}`}
              >
                <div className="movie-card-wrapper">
                  <MovieCard movie={watched.movie} clickable={false} from="watched"/>
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveClick(watched)}
                    title="Retirer de la liste"
                    disabled={removingIds.has(watched.id)}
                  >
                    ✕
                  </button>
                </div>
                <p className="watched-date">
                  Vu le : {new Date(watched.watched_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="accordion grouped-container" id="watchedAccordion">
            {Object.entries(groupedWatched).map(([period, group], index) => (
              <div className="accordion-item" key={period}>
                <h2 className="accordion-header" id={`heading-${index}`}>
                  <button
                    className={`accordion-button ${index !== 0 ? 'collapsed' : ''}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapse-${index}`}
                  >
                    {group.label} ({group.count})
                  </button>
                </h2>

                <div
                  id={`collapse-${index}`}
                  className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
                  data-bs-parent="#watchedAccordion"
                >
                  <div className="accordion-body p-0 px-1 py-3">
                    <div className="movies-row-scroll">
                      {group.movies.map((watched) => (
                        <div
                          key={watched.id}
                          className={`watched-movie-item ${removingIds.has(watched.id) ? 'removing' : ''}`}
                        >
                          <div className="movie-card-wrapper">
                            <MovieCard movie={watched.movie} clickable={false} from="watched"/>
                            <button
                              className="remove-button"
                              onClick={() => handleRemoveClick(watched)}
                              title="Retirer de la liste"
                              disabled={removingIds.has(watched.id)}
                            >
                              ✕
                            </button>
                          </div>
                          <p className="watched-date">
                            Vu le : {new Date(watched.watched_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay" onClick={handleCancelRemove}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Retirer de la liste ?</h3>
            <p>
              Retirer <strong>{movieToRemove?.movie?.title}</strong> de votre liste ?
            </p>
            <div className="dialog-actions">
              <button className="btn-cancel" onClick={handleCancelRemove}>
                Annuler
              </button>
              <button className="btn-confirm" onClick={handleConfirmRemove}>
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default WatchedPage;
