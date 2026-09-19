import { useState, useEffect } from 'react';
import TopBar from '../components/common/TopBar';
import { friendService } from '../services/friendService';
import { movieService } from '../services/movieService';
import './FriendsPage.css';

function FriendsPage() {
  const [activeTab, setActiveTab] = useState('friends');
  const [recoSubTab, setRecoSubTab] = useState('received');
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState({ received: [], sent: [] });
  const [recommendations, setRecommendations] = useState([]);
  const [sentRecos, setSentRecos] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [addErrors, setAddErrors] = useState({});
  const [unreadRecos, setUnreadRecos] = useState(0);

  const loadFriends = () => {
    friendService.getFriends().then(d => setFriends(d.friends || [])).catch(() => {});
    friendService.getPending().then(d => setPending(d)).catch(() => {});
    friendService.getNotifications().then(d => setUnreadRecos(d.unread_recos || 0)).catch(() => {});
  };

  const loadRecos = () => {
    friendService.getRecommendations().then(d => {
      setRecommendations(d.recommendations || []);
      setUnreadRecos(0);
    }).catch(() => {});
  };

  const loadSentRecos = () => {
    friendService.getSentRecommendations().then(d => {
      setSentRecos(d.recommendations || []);
    }).catch(() => {});
  };

  useEffect(() => {
    loadFriends();
    const interval = setInterval(loadFriends, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'recos') {
      loadRecos();
      loadSentRecos();
    }
  }, [activeTab]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSendError('');
    setSendSuccess('');
    try {
      const res = await friendService.sendRequest(searchInput.trim());
      setSendSuccess(res.message);
      setSearchInput('');
      loadFriends();
    } catch (err) {
      setSendError(err?.message || 'Erreur');
    }
  };

  const handleRespond = async (id, action) => {
    await friendService.respond(id, action).catch(() => {});
    loadFriends();
  };

  const handleRemove = async (id) => {
    await friendService.remove(id).catch(() => {});
    loadFriends();
  };

  const handleAddToWishlist = async (reco) => {
    setAddErrors(prev => ({ ...prev, [reco.id]: null }));
    try {
      await movieService.addMovie(reco.movie_id, false);
      setRecommendations(prev => prev.map(r => r.id === reco.id ? { ...r, in_wishlist: true } : r));
    } catch (err) {
      setAddErrors(prev => ({ ...prev, [reco.id]: err?.message || 'Erreur' }));
    }
  };

  const handleDeleteReco = async (id) => {
    await friendService.deleteRecommendation(id).catch(() => {});
    setRecommendations(prev => prev.filter(r => r.id !== id));
  };

  const pendingCount = pending.received?.length || 0;

  const renderRecoCard = (r, showFrom = true) => (
    <div key={r.id} className="reco-card">
      {r.poster_path
        ? <img src={`https://image.tmdb.org/t/p/w300${r.poster_path}`} alt={r.title} className="reco-poster" />
        : <div className="reco-poster reco-no-poster" />
      }
      <div className="reco-info">
        <span className="reco-title">{r.title}</span>
        <span className="reco-meta">
          {r.release_date?.slice(0, 4)}{r.vote_average ? ` · ⭐ ${(r.vote_average / 2).toFixed(1)}` : ''}
        </span>
        <span className="reco-from">{showFrom ? `par ${r.from}` : `à ${r.to}`}</span>
        {showFrom && (
          <div className="reco-actions">
            {r.in_wishlist
              ? <span className="reco-in-wishlist">✓ Dans ma wishlist</span>
              : <button className="friends-btn-primary reco-add-btn" onClick={() => handleAddToWishlist(r)}>Ajouter</button>
            }
            {addErrors[r.id] && <span className="friends-error reco-add-error">{addErrors[r.id]}</span>}
            <button className="friends-btn-danger reco-del-btn" onClick={() => handleDeleteReco(r.id)}>✕</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="friends-page">
      <TopBar />
      <div className="friends-container">
        <div className="friends-tabs">
          <button
            className={`friends-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Amis
            {pendingCount > 0 && <span className="friends-tab-badge">{pendingCount}</span>}
          </button>
          <button
            className={`friends-tab-btn ${activeTab === 'recos' ? 'active' : ''}`}
            onClick={() => setActiveTab('recos')}
          >
            Recommandations
            {unreadRecos > 0 && <span className="friends-tab-badge">{unreadRecos}</span>}
          </button>
        </div>

        {/* ONGLET AMIS */}
        {activeTab === 'friends' && (
          <>
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
          </>
        )}

        {/* ONGLET RECOMMANDATIONS */}
        {activeTab === 'recos' && (
          <section className="friends-section">
            <div className="recos-subtabs">
              <button
                className={`recos-subtab-btn ${recoSubTab === 'received' ? 'active' : ''}`}
                onClick={() => setRecoSubTab('received')}
              >
                Reçues {recommendations.length > 0 && `(${recommendations.length})`}
              </button>
              <button
                className={`recos-subtab-btn ${recoSubTab === 'sent' ? 'active' : ''}`}
                onClick={() => setRecoSubTab('sent')}
              >
                Envoyées {sentRecos.length > 0 && `(${sentRecos.length})`}
              </button>
            </div>

            {recoSubTab === 'received' && (
              recommendations.length === 0
                ? <p className="friends-empty">Aucune recommandation reçue</p>
                : <div className="recos-grid">{recommendations.map(r => renderRecoCard(r, true))}</div>
            )}

            {recoSubTab === 'sent' && (
              sentRecos.length === 0
                ? <p className="friends-empty">Aucune recommandation envoyée</p>
                : <div className="recos-grid">{sentRecos.map(r => renderRecoCard(r, false))}</div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default FriendsPage;
