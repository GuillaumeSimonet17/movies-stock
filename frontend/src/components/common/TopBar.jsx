import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { friendService } from '../../services/friendService';
import { movieService } from '../../services/movieService';
import { movieNotifIcon, movieNotifLabel } from '../../utils/movieNotifications';
import Drawer from './Drawer';
import './TopBar.css';

const TOASTED_NOTIFS_KEY = 'movie_notifs_toasted';

const readToasted = () => {
  try { return JSON.parse(localStorage.getItem(TOASTED_NOTIFS_KEY) || '[]'); } catch { return []; }
};

const writeToasted = (ids) => {
  try { localStorage.setItem(TOASTED_NOTIFS_KEY, JSON.stringify(ids.slice(-200))); } catch { /* storage unavailable */ }
};

function TopBar({ bgColor, textColor }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [movieNotifCount, setMovieNotifCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const seenAccepted = useRef(new Set());

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const showToast = (msg, { link = null, duration = 4000 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, link }]);
    setTimeout(() => dismissToast(id), duration);
  };

  // Movie notifications (Netflix arrivals, releases) stay in the "Sorties" page until clicked there.
  // Here: badge count, plus a toast the first time each one is seen on this device.
  useEffect(() => {
    const fetchMovieNotifs = () => movieService.getMovieNotifications().then(d => {
      const notifications = d.notifications || [];
      setMovieNotifCount(notifications.length);
      const toasted = readToasted();
      const fresh = notifications.filter(n => !toasted.includes(n.id));
      fresh.forEach(n => {
        showToast(`${movieNotifIcon(n)} ${n.title} · ${movieNotifLabel(n, d.date)}`, { link: '/sorties', duration: 8000 });
      });
      if (fresh.length) writeToasted([...toasted, ...fresh.map(n => n.id)]);
    }).catch(() => {});
    fetchMovieNotifs();
    const interval = setInterval(fetchMovieNotifs, 60000);
    window.addEventListener('movie-notifs-changed', fetchMovieNotifs);
    return () => {
      clearInterval(interval);
      window.removeEventListener('movie-notifs-changed', fetchMovieNotifs);
    };
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
          {notifCount + movieNotifCount > 0 && (
            <span className="menu-btn-badge">{notifCount + movieNotifCount}</span>
          )}
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
          {toasts.map(t => t.link ? (
            <button
              key={t.id}
              type="button"
              className="topbar-toast topbar-toast-link"
              onClick={() => { dismissToast(t.id); navigate(t.link); }}
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
