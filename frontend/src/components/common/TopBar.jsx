import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { friendService } from '../../services/friendService';
import { movieService } from '../../services/movieService';
import Drawer from './Drawer';
import './TopBar.css';

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

  // Movie notifications: releases of the day (shown once per day) and Netflix arrivals (shown once)
  useEffect(() => {
    const fetchMovieNotifs = () => movieService.getMovieNotifications().then(d => {
      const storageKey = `release_notifs_${d.date}`;
      let shown = [];
      try { shown = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { /* storage unavailable */ }
      const fresh = (d.released_today || []).filter(m => !shown.includes(m.movie_id));
      fresh.forEach(m => {
        const where = m.region === 'FR' ? 'en France' : 'aux USA';
        showToast(`🎬 Sort aujourd'hui ${where} : ${m.title}`, { movieId: m.movie_id, duration: 8000 });
      });
      if (fresh.length) {
        try {
          localStorage.setItem(storageKey, JSON.stringify([...shown, ...fresh.map(m => m.movie_id)]));
        } catch { /* storage unavailable */ }
      }

      const netflix = d.netflix || [];
      netflix.forEach(n => {
        showToast(`🍿 ${n.title} est maintenant sur Netflix`, { movieId: n.movie_id, duration: 8000 });
      });
      if (netflix.length) {
        movieService.markMovieNotificationsRead(netflix.map(n => n.id)).catch(() => {});
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
