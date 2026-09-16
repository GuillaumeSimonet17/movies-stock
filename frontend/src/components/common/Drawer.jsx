import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { movieService } from '../../services/movieService';
import './Drawer.css';

function Drawer({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [totalCount, setTotalCount] = useState(null);

  useEffect(() => {
    if (isOpen && totalCount === null) {
      movieService.getMovies().then(data => setTotalCount(data?.total_count ?? 0)).catch(() => {});
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>Hollylist</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="drawer-content">
          <nav className="drawer-nav">
            <Link to="/" onClick={onClose}>
              <span className="icon">🏠</span>
              My Collection
              {totalCount !== null && <span className="drawer-count">{totalCount}</span>}
            </Link>
            <Link to="/watched" onClick={onClose}>
              <span className="icon">✓</span>
              Watched Movies
            </Link>
          </nav>
        </div>

        <div className="drawer-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

export default Drawer;
