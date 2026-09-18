import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { movieService } from '../../services/movieService';
import { listService } from '../../services/listService';
import './Drawer.css';

function Drawer({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [totalCount, setTotalCount] = useState(null);
  const [watchedCount, setWatchedCount] = useState(null);
  const [lists, setLists] = useState([]);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (totalCount === null) {
        movieService.getMovies().then(data => setTotalCount(data?.total_count ?? 0)).catch(() => {});
      }
      if (watchedCount === null) {
        listService.getWatchedCount().then(data => setWatchedCount(data?.count ?? 0)).catch(() => {});
      }
      listService.getLists().then(data => setLists(data)).catch(() => {});
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

  const handleCreateList = async (e) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    try {
      const created = await listService.createList(name);
      setLists(prev => [...prev, created]);
      setNewListName('');
      setCreatingList(false);
    } catch (error) {
      console.error('Error creating list:', error);
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
              {watchedCount !== null && <span className="drawer-count">{watchedCount}</span>}
            </Link>
          </nav>

          <div className="drawer-lists-section">
            <div className="drawer-lists-header">
              <span className="drawer-lists-title">My Lists</span>
              <button
                className="drawer-lists-add-btn"
                onClick={() => setCreatingList(true)}
                title="Create a new list"
              >
                +
              </button>
            </div>

            {creatingList && (
              <form className="drawer-create-list-form" onSubmit={handleCreateList}>
                <input
                  autoFocus
                  type="text"
                  placeholder="List name..."
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  className="drawer-list-input"
                />
                <div className="drawer-create-list-actions">
                  <button type="submit" className="drawer-list-btn-confirm">Create</button>
                  <button
                    type="button"
                    className="drawer-list-btn-cancel"
                    onClick={() => { setCreatingList(false); setNewListName(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <nav className="drawer-nav drawer-lists-nav">
              {lists.length === 0 && !creatingList && (
                <p className="drawer-lists-empty">No lists yet</p>
              )}
              {lists.map(lst => (
                <Link key={lst.id} to={`/lists/${lst.id}`} onClick={onClose}>
                  <span className="icon">📋</span>
                  {lst.name}
                  <span className="drawer-count">{lst.count}</span>
                </Link>
              ))}
            </nav>
          </div>
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
