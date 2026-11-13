import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/common/TopBar';
import { movieService } from '../services/movieService';
import { movieNotifIcon, movieNotifLabel } from '../utils/movieNotifications';
import './ReleasesPage.css';

function ReleasesPage() {
  const [notifications, setNotifications] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    movieService.getMovieNotifications()
      .then(d => {
        setNotifications(d.notifications || []);
        setToday(d.date);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dismiss = (ids) => {
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    window.dispatchEvent(new Event('movie-notifs-changed'));
    return movieService.markMovieNotificationsRead(ids).catch(() => {});
  };

  const openMovie = async (n) => {
    await dismiss([n.id]);
    navigate(`/movie/${n.movie_id}`);
  };

  return (
    <div className="releases-page">
      <TopBar />
      <div className="content releases-content">
        <div className="releases-header">
          <h1>Sorties</h1>
          {notifications.length > 1 && (
            <button className="releases-clear-btn" onClick={() => dismiss(notifications.map(n => n.id))}>
              Tout effacer
            </button>
          )}
        </div>

        {loading ? (
          <p className="releases-empty">Chargement…</p>
        ) : notifications.length === 0 ? (
          <p className="releases-empty">Rien de neuf pour l'instant.</p>
        ) : (
          <ul className="releases-list">
            {notifications.map(n => (
              <li key={n.id} className="release-item">
                <button className="release-open" onClick={() => openMovie(n)}>
                  {n.poster_path ? (
                    <img
                      className="release-poster"
                      src={`https://image.tmdb.org/t/p/w154${n.poster_path}`}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="release-poster release-poster-empty" />
                  )}
                  <span className="release-text">
                    <span className="release-title">{n.title}</span>
                    <span className={`release-label release-label-${n.kind}`}>
                      {movieNotifIcon(n)} {movieNotifLabel(n, today)}
                    </span>
                  </span>
                </button>
                <button
                  className="release-dismiss"
                  onClick={() => dismiss([n.id])}
                  aria-label={`Effacer la notification pour ${n.title}`}
                  title="Effacer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ReleasesPage;
