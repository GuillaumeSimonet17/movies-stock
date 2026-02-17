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

  if (loading) {
    return (
      <div className="watched-page">
        <TopBar/>
        <div className="loading-container">Loading watched movies...</div>
      </div>
    );
  }

  return (
    <div className="watched-page">
      <TopBar/>

      <div className="content">
        <div className="watched-header">
          <h1>Watched Movies</h1>
          <p className="watched-count">
            Total watched: <strong>{totalCount}</strong>
          </p>
        </div>

        <div className="grouping-controls">
          <button
            className={groupBy === 'all' ? 'active' : ''}
            onClick={() => setGroupBy('all')}
          >
            All
          </button>
          <button
            className={groupBy === 'year' ? 'active' : ''}
            onClick={() => setGroupBy('year')}
          >
            By Year
          </button>
          <button
            className={groupBy === 'month' ? 'active' : ''}
            onClick={() => setGroupBy('month')}
          >
            By Month
          </button>
          <button
            className={groupBy === 'week' ? 'active' : ''}
            onClick={() => setGroupBy('week')}
          >
            By Week
          </button>
        </div>

        {totalCount === 0 ? (
          <div className="empty-state">
            <h2>No watched movies yet</h2>
            <p>Movies you mark as watched will appear here.</p>
          </div>
        ) : groupBy === 'all' ? (
          <div className="movies-wrap">
            {watchedMovies.map((watched) => (
              <div key={watched.id} className="watched-movie-item">
                <MovieCard movie={watched.movie} clickable={false} from="watched"/>
                <p className="watched-date">
                  Watched: {new Date(watched.watched_at).toLocaleDateString()}
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
                        <div key={watched.id} className="watched-movie-item">
                          <MovieCard movie={watched.movie} clickable={false} from="watched"/>
                          <p className="watched-date">
                            {new Date(watched.watched_at).toLocaleDateString()}
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
    </div>
  );
}

export default WatchedPage;
