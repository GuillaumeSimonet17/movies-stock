import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { friendService } from '../../services/friendService';
import Drawer from './Drawer';
import './TopBar.css';

function TopBar({ bgColor, textColor }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/friends') {
      setNotifCount(0);
      return;
    }
    const fetch = () => friendService.getNotifications().then(d => setNotifCount(d.total || 0)).catch(() => {});
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
    </>
  );
}

export default TopBar;
