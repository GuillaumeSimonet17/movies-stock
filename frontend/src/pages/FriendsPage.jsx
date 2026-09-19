import { useState, useEffect } from 'react';
import TopBar from '../components/common/TopBar';
import { friendService } from '../services/friendService';
import './FriendsPage.css';

function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState({ received: [], sent: [] });
  const [searchInput, setSearchInput] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  const load = () => {
    friendService.getFriends().then(d => setFriends(d.friends || [])).catch(() => {});
    friendService.getPending().then(d => setPending(d)).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setSendError('');
    setSendSuccess('');
    try {
      const res = await friendService.sendRequest(searchInput.trim());
      setSendSuccess(res.message);
      setSearchInput('');
      load();
    } catch (err) {
      setSendError(err?.message || 'Erreur');
    }
  };

  const handleRespond = async (id, action) => {
    await friendService.respond(id, action).catch(() => {});
    load();
  };

  const handleRemove = async (id) => {
    await friendService.remove(id).catch(() => {});
    load();
  };

  return (
    <div className="friends-page">
      <TopBar />
      <div className="friends-container">
        <h2 className="friends-title">Amis</h2>

        {/* AJOUTER UN AMI */}
        <section className="friends-section">
          <h3 className="friends-section-title">Ajouter un ami</h3>
          <form className="friends-search-form" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Pseudo..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="friends-input"
            />
            <button type="submit" className="friends-btn-primary">Envoyer</button>
          </form>
          {sendError && <p className="friends-error">{sendError}</p>}
          {sendSuccess && <p className="friends-success">{sendSuccess}</p>}
        </section>

        {/* DEMANDES REÇUES */}
        {pending.received?.length > 0 && (
          <section className="friends-section">
            <h3 className="friends-section-title">Demandes reçues</h3>
            <div className="friends-list">
              {pending.received.map(f => (
                <div key={f.id} className="friend-item">
                  <span className="friend-username">{f.from.username}</span>
                  <div className="friend-actions">
                    <button className="friends-btn-primary" onClick={() => handleRespond(f.id, 'accept')}>Accepter</button>
                    <button className="friends-btn-secondary" onClick={() => handleRespond(f.id, 'decline')}>Refuser</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DEMANDES ENVOYÉES */}
        {pending.sent?.length > 0 && (
          <section className="friends-section">
            <h3 className="friends-section-title">Demandes envoyées</h3>
            <div className="friends-list">
              {pending.sent.map(f => (
                <div key={f.id} className="friend-item">
                  <span className="friend-username">{f.to.username}</span>
                  <span className="friend-status">En attente...</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MES AMIS */}
        <section className="friends-section">
          <h3 className="friends-section-title">Mes amis {friends.length > 0 && `(${friends.length})`}</h3>
          {friends.length === 0
            ? <p className="friends-empty">Aucun ami pour l'instant</p>
            : (
              <div className="friends-list">
                {friends.map(f => (
                  <div key={f.id} className="friend-item">
                    <span className="friend-username">{f.user.username}</span>
                    <button className="friends-btn-danger" onClick={() => handleRemove(f.id)}>Retirer</button>
                  </div>
                ))}
              </div>
            )
          }
        </section>
      </div>
    </div>
  );
}

export default FriendsPage;
