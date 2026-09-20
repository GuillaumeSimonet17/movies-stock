import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { friendService } from '../../services/friendService';
import Drawer from './Drawer';
import './TopBar.css';

function TopBar({ bgColor, textColor }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const seenAccepted = useRef(new Set());

  const showToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

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

      {toasts.map(t => (
        <div key={t.id} className="topbar-toast">
          {t.msg}
        </div>
      ))}
    </>
  );
}

export default TopBar;
