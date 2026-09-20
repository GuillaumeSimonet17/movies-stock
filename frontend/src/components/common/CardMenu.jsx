import { useState, useEffect, useRef } from 'react';
import { friendService } from '../../services/friendService';
import './CardMenu.css';

function CardMenu({ movie, onRemoveClick }) {
  const [open, setOpen] = useState(false);
  const [wizard, setWizard] = useState(null);
  const [friends, setFriends] = useState([]);
  const [recoStatus, setRecoStatus] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openRecommend = async () => {
    setOpen(false);
    setRecoStatus(null);
    const data = await friendService.getFriends().catch(() => ({ friends: [] }));
    setFriends(data.friends || []);
    setWizard('recommend');
  };

  const openDelete = () => {
    setOpen(false);
    setWizard('delete');
  };

  const sendReco = async (friendId) => {
    setRecoStatus('sending');
    try {
      await friendService.sendRecommendation(friendId, movie.movie_id ?? movie.id, {
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
      });
      setRecoStatus('ok');
      setTimeout(() => { setWizard(null); setRecoStatus(null); }, 1200);
    } catch (err) {
      setRecoStatus(err?.message || 'Erreur');
    }
  };

  const confirmDelete = () => {
    setWizard(null);
    onRemoveClick(movie);
  };

  return (
    <>
      <div className="card-menu-wrap" ref={menuRef}>
        <button
          className="card-menu-btn"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
          title="Options"
        >
          ⋮
        </button>
        {open && (
          <div className="card-menu-dropdown">
            <button onClick={(e) => { e.stopPropagation(); openRecommend(); }}>
              Recommander
            </button>
            {onRemoveClick && (
              <button className="danger" onClick={(e) => { e.stopPropagation(); openDelete(); }}>
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>

      {wizard === 'recommend' && (
        <div className="card-wizard-overlay" onClick={() => setWizard(null)}>
          <div className="card-wizard" onClick={e => e.stopPropagation()}>
            <h3>Recommander à un ami</h3>
            <p className="card-wizard-movie">{movie.title || movie.name}</p>
            {recoStatus === 'ok' ? (
              <p className="card-wizard-success">Recommandation envoyée ✓</p>
            ) : friends.length === 0 ? (
              <p className="card-wizard-empty">Aucun ami pour l'instant</p>
            ) : (
              <div className="card-wizard-friends">
                {friends.map(f => (
                  <button
                    key={f.id}
                    className="card-wizard-friend-btn"
                    onClick={() => sendReco(f.user.id)}
                    disabled={recoStatus === 'sending'}
                  >
                    {f.user.username}
                  </button>
                ))}
              </div>
            )}
            {recoStatus && recoStatus !== 'ok' && recoStatus !== 'sending' && (
              <p className="card-wizard-error">{recoStatus}</p>
            )}
            <button className="card-wizard-cancel" onClick={() => setWizard(null)}>Fermer</button>
          </div>
        </div>
      )}

      {wizard === 'delete' && onRemoveClick && (
        <div className="card-wizard-overlay" onClick={() => setWizard(null)}>
          <div className="card-wizard" onClick={e => e.stopPropagation()}>
            <h3>Supprimer ?</h3>
            <p>Retirer <strong>{movie.title || movie.name}</strong> ?</p>
            <div className="card-wizard-actions">
              <button className="card-wizard-cancel" onClick={() => setWizard(null)}>Annuler</button>
              <button className="card-wizard-confirm" onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CardMenu;
