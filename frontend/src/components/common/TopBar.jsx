import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { friendService } from '../../services/friendService';
import { movieService } from '../../services/movieService';
import Drawer from './Drawer';
import './TopBar.css';

const formatShortDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

const movieNotifMessage = (n, today) => {
  if (n.kind === 'netflix') return `🍿 ${n.title} est maintenant sur Netflix`;
  const where = n.kind === 'release_fr' ? 'en France' : 'aux USA';
  if (!n.release_date || n.release_date === today) return `🎬 Sort aujourd'hui ${where} : ${n.title}`;
  return `🎬 ${n.title} est sorti ${where} le ${formatShortDate(n.release_date)}`;
};

function TopBar({ bgColor, textColor }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const seenAccepted = useRef(new Set());

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const showToast = (msg, { movieId = null, duration = 4000 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, movieId }]);
    setTimeout(() => dismissToast(id), duration);
  };

  // Movie notifications (Netflix arrivals, releases): each one is shown once, then marked read
  useEffect(() => {
    const fetchMovieNotifs = () => movieService.getMovieNotifications().then(d => {
      const notifications = d.notifications || [];
      notifications.forEach(n => {
        showToast(movieNotifMessage(n, d.date), { movieId: n.movie_id, duration: 8000 });
      });
      if (notifications.length) {
        movieService.markMovieNotificationsRead(notifications.map(n => n.id)).catch(() => {});
      }
    }).catch(() => {});
    fetchMovieNotifs();
    const interval = setInterval(fetchMovieNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.pathname === '/friends') {
      setNotifCount(0);
      return;
    }
    const fetch = () => friendService.getNotifications().then(d => {
      setNotifCount(d.total || 0);
      const list = d.friend_accepted_list || [];
      list.forEach(username => {
        if (!seenAccepted.current.has(username)) {
          seenAccepted.current.add(username);
          // Stocker pour la page amis (lu une seule fois par session)
          const stored = JSON.parse(sessionStorage.getItem('friend_accepted_notifs') || '[]');
          if (!stored.includes(username)) {
            sessionStorage.setItem('friend_accepted_notifs', JSON.stringify([...stored, username]));
          }
          showToast(`${username} a accepté ta demande d'ami`);
        }
      });
    }).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const style = {
    background: bgColor || (theme === 'dark' ? '#111' : '#ffffff'),
    color: textColor || (theme === 'dark' ? '#BA1818' : '#000'),
  };

  return (
    <>
      <header className="top-bar" style={style}>
        <button
          className="menu-btn"
          onClick={() => setDrawerOpen(true)}
          style={{ color: style.color }}
        >
          ☰
          {notifCount > 0 && <span className="menu-btn-badge">{notifCount}</span>}
        </button>

        <Link to="/" className="app-title-link">
          <h1 className="app-title" style={{ color: style.color }}>
            Hollylist
          </h1>
        </Link>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          style={{ color: style.color }}
        >
          🌓
        </button>
      </header>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {toasts.length > 0 && (
        <div className="topbar-toasts">
          {toasts.map(t => t.movieId ? (
            <button
              key={t.id}
              type="button"
              className="topbar-toast topbar-toast-link"
              onClick={() => { dismissToast(t.id); navigate(`/movie/${t.movieId}`); }}
            >
              {t.msg}
            </button>
          ) : (
            <div key={t.id} className="topbar-toast">
              {t.msg}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default TopBar;
