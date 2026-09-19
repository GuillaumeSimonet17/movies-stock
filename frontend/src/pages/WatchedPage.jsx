import {useState, useEffect} from 'react';
import TopBar from '../components/common/TopBar';
import MovieCard from '../components/common/MovieCard';
import CardMenu from '../components/common/CardMenu';
import {watchedService} from '../services/watchedService';
import './WatchedPage.css';

function WatchedPage() {
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [groupedWatched, setGroupedWatched] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [groupBy, setGroupBy] = useState('all');
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState(new Set());
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

  const handleRemoveClick = async (watchedMovie) => {
    const movieId = watchedMovie.movie.id;
    const watchedId = watchedMovie.id;

    setRemovingIds(prev => new Set(prev).add(watchedId));

    const previousWatchedMovies = [...watchedMovies];
    const previousGroupedWatched = {...groupedWatched};
    const previousCount = totalCount;

    setWatchedMovies(prev => prev.filter(w => w.id !== watchedId));
    setTotalCount(prev => prev - 1);

    if (groupBy !== 'all') {
      const updatedGrouped = {...groupedWatched};
      for (const [period, group] of Object.entries(updatedGrouped)) {
        updatedGrouped[period] = {
          ...group,
          movies: group.movies.filter(w => w.id !== watchedId),
          count: group.movies.filter(w => w.id !== watchedId).length
        };
        if (updatedGrouped[period].count === 0) delete updatedGrouped[period];
      }
      setGroupedWatched(updatedGrouped);
    }

    try {
      await watchedService.removeFromWatched(movieId);
      showToast('Film retiré de la liste', 'success');
    } catch {
      setWatchedMovies(previousWatchedMovies);
      setGroupedWatched(previousGroupedWatched);
      setTotalCount(previousCount);
      showToast('Erreur, veuillez réessayer.', 'error');
    } finally {
      setRemovingIds(prev => { const s = new Set(prev); s.delete(watchedId); return s; });
    }
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
                  <CardMenu movie={watched.movie} onRemoveClick={() => handleRemoveClick(watched)} />
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
                            <CardMenu movie={watched.movie} onRemoveClick={() => handleRemoveClick(watched)} />
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
