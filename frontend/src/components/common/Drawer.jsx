import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Drawer.css';

function Drawer({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          {user && (
            <div className="user-info">
              <p className="username">{user.username}</p>
              {user.email && <p className="email">{user.email}</p>}
            </div>
          )}

          <nav className="drawer-nav">
            <Link to="/" onClick={onClose}>
              <span className="icon">🏠</span>
              My Collection
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
