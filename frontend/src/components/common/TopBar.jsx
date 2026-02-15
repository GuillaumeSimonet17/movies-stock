import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import Drawer from './Drawer';
import './TopBar.css';

function TopBar({ bgColor, textColor }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const style = {
    background: bgColor || (theme === 'dark' ? '#111' : '#ffffff'),
    color: textColor || (theme === 'dark' ? '#fff' : '#000'),
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
