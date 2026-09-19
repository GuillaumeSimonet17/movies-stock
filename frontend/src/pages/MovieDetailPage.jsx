import {useState, useEffect, useCallback, useRef} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import TopBar from '../components/common/TopBar';
import {movieService} from '../services/movieService';
import {watchedService} from '../services/watchedService';
import {listService} from '../services/listService';
import {getGenreName} from '../utils/genreMapping';
import './MovieDetailPage.css';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faYoutube, faGoogle} from '@fortawesome/free-brands-svg-icons'
import {useLocation} from 'react-router-dom';
import MovieCard from '../components/common/MovieCard';

const StarRating = ({ value }) => {
  const rating = value / 2;
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.min(1, Math.max(0, rating - (i - 1)));
        const pct = Math.round(fill * 100);
        return (
          <span key={i} className="star-wrap">
            <span className="star-bg">★</span>
            <span className="star-fg" style={{width: `${pct}%`}}>★</span>
          </span>
        );
      })}
      <span className="star-value">{(value / 2).toFixed(1)}/5</span>
    </span>
  );
};

const toOpaqueColor = (hex) => {
  if (!hex) return '#ffffff';
  return hex.slice(0, 7);
};

const getLuminance = (hex) => {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getDropdownTextColor = (bgHex) => {
  return getLuminance(toOpaqueColor(bgHex)) > 0.45 ? '#1a1a1a' : '#f0f0f0';
};

const adjustColor = (hex, amount) => {
  const c = toOpaqueColor(hex).replace('#', '');
  const clamp = (v) => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(c.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(c.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(c.slice(4, 6), 16) + amount);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

const getAccentColor = (hex) => {
  const opaque = toOpaqueColor(hex);
  return getLuminance(opaque) < 0.45 ? adjustColor(opaque, 60) : adjustColor(opaque, -60);
};

function MovieDetailPage() {
  const location = useLocation();
  const movieList = location.state?.movieList || [];
  const sourceListId = location.state?.sourceListId || null;

  const {id} = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textColor, setTextColor] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(true);
  const [yts1, setYts1] = useState(true);
  const [yts2, setYts2] = useState(true);
  const [similarByDirector, setSimilarByDirector] = useState([]);
  const [similarByActor, setSimilarByActor] = useState([]);
  const [similarByKeyword, setSimilarByKeyword] = useState([]);
  const [activeTab, setActiveTab] = useState('images');
  const [userLists, setUserLists] = useState([]);
  const [showListMenu, setShowListMenu] = useState(false);
  const [listToast, setListToast] = useState({ show: false, message: '', type: '' });
  const listMenuRef = useRef(null);
  const [streamingOffers, setStreamingOffers] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [filmography, setFilmography] = useState({ films: [], director: null });

  const currentIndex = movieList.findIndex(m => m.id === Number(id));

  const prevMovie =
    currentIndex > 0 ? movieList[currentIndex - 1] : null;

  const nextMovie =
    currentIndex < movieList.length - 1 ? movieList[currentIndex + 1] : null;

  const loadMovie = useCallback(async () => {
    setLoading(true);
    try {
      const data = await movieService.getMovieDetail(id, sourceListId);

      setMovie(data.movie);

      setBackgroundColor(data.background);
      setTextColor(data.text_color);
      setYts1(data.yts1)
      setYts2(data.yts2)
      setSimilarByDirector(data.similar_by_director || [])
      setSimilarByActor(data.similar_by_actor || [])
      setSimilarByKeyword(data.similar_by_keyword || [])
      const hasImages = data.movie.filepath_set?.length > 0 || false;
      setActiveTab(hasImages ? 'images' : 'similar')

      if (!data.movie.filepath_set || data.movie.filepath_set.length === 0) {
        try {
          // await movieService.fetchMedia(id);
          const updated = await movieService.getMovieDetail(id);
          setMovie(updated.movie);
        } catch (err) {
          console.error('Media fetch error:', err);
        }
      }

    } catch (error) {
      console.error('Error loading movie:', error);
      alert('Movie not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, sourceListId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadMovie();
    listService.getLists().then(setUserLists).catch(() => {});
  }, [loadMovie]);

  useEffect(() => {
    if (!id) return;
    movieService.getStreaming(id).then(data => setStreamingOffers(data.offers || [])).catch(() => setStreamingOffers([]));
    movieService.getSuggestions(id).then(data => setSuggestions(data.suggestions || [])).catch(() => setSuggestions([]));
    movieService.getFilmography(id).then(data => setFilmography({ films: data.films || [], director: data.director })).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!showListMenu) return;
    const handleClick = (e) => {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target)) {
        setShowListMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showListMenu]);

  const handleAddToList = async (listId) => {
    setShowListMenu(false);
    try {
      await listService.addMovie(listId, id);
      const listName = userLists.find(l => l.id === listId)?.name || 'list';
      setListToast({ show: true, message: `Ajouté à "${listName}"`, type: 'success' });
    } catch (err) {
      const listName = userLists.find(l => l.id === listId)?.name || 'list';
      const isAlready = err?.message?.toLowerCase().includes('already');
      const msg = isAlready ? `Déjà dans "${listName}"` : "Impossible d'ajouter à la liste";
      setListToast({ show: true, message: msg, type: 'error' });
    }
    setTimeout(() => setListToast({ show: false, message: '', type: '' }), 3000);
  };

  const goToMovie = (movieId) => {
    navigate(`/movie/${movieId}`, {
      state: {movieList, sourceListId}
    });
  };

  const handleMarkWatched = async () => {
    try {
      await watchedService.addToWatched(id, sourceListId);
      navigate(sourceListId ? `/lists/${sourceListId}` : '/');
    } catch (error) {
      alert(error.message || 'Failed to mark as watched');
    }
  };

  const handleDelete = async () => {
    try {
      if (sourceListId) {
        await listService.removeMovie(sourceListId, id);
      } else {
        await movieService.deleteMovie(id);
      }
      navigate(sourceListId ? `/lists/${sourceListId}` : '/');
    } catch {
      navigate(sourceListId ? `/lists/${sourceListId}` : '/');
    }
  };

  const handleRandomMovie = async () => {
    try {
      const movie = await movieService.getRandomMovie();
      navigate(`/movie/${movie.id}`);
    } catch (error) {
      console.error('Error getting random movie:', error);
    }
  };

  if (loading || !movie) {
    return (
      <div className="movie-detail-page">
        <TopBar bgColor={backgroundColor} textColor={textColor}/>
        <div className="loading-container">Chargement...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="movie-detail-page">
        <TopBar bgColor={backgroundColor} textColor={textColor}/>
        <div className="error">Movie not found</div>
      </div>
    );
  }

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.png';

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : '';

  const renderGenre = (genre) => {
    if (typeof genre === 'object') return genre.name;
    return getGenreName(genre);
  };

  const buildImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/w780${path}`;
  };

  const renderStreamingOffers = () => {
    if (streamingOffers === null) return <p style={{opacity: 0.6, fontSize: '0.85rem'}}>Recherche des plateformes...</p>;
    if (!streamingOffers.length) return null;
    return (
      <div className="streaming-badges">
        {streamingOffers.map((o, i) => (
          <a key={i} href={o.url} target="_blank" rel="noreferrer" className="streaming-badge"
            title={`${o.provider}${o.price ? ' — ' + o.price : ''}`}>
            {o.icon ? <img src={o.icon} alt={o.provider} /> : <span>{o.provider}</span>}
          </a>
        ))}
      </div>
    );
  };

  return (
    <div
      className="movie-page"
      style={{background: movie.dominant_color || '#000'}}
    >
      <TopBar bgColor={movie.dominant_color} textColor={textColor}/>

      <main className="container movie_page_container p-5"
            style={{
              color: textColor,
              background: backgroundColor
            }}>

        {/* HEADER */}
        <div className="row head d-flex justify-content-center">
          <div className="col-md-6 d-flex align-items-center">
            <h2 className="title">
              {movie.title} {year && `(${year})`}
            </h2>
          </div>

          <div className="col-md-6 d-flex justify-content-center justify-content-md-end gap-3 btn_pass">
            <div className="movie-nav">
              {prevMovie && (
                <div className="btn-movie-page-wrapper">
                  <span className="btn-movie-page btn-nav btn-nav-prev" onClick={() => goToMovie(prevMovie.id)}>◂</span>
                </div>
              )}
            </div>
            <div className="btn-movie-page-wrapper">
              <span className={"btn-movie-page btn-seen"} onClick={handleMarkWatched} title="Je viens de le voir">✓</span>
              <span className="btn-movie-tooltip">Je viens de le voir</span>
            </div>
            <div className="btn-movie-page-wrapper">
              <span className={"btn-movie-page btn-nope"} onClick={handleDelete} title="Pas envie de le voir">✕</span>
              <span className="btn-movie-tooltip">Pas envie de le voir</span>
            </div>
            {userLists.length > 0 && (
              <div className="list-menu-wrapper" ref={listMenuRef}>
                <span className={"btn-movie-page"} onClick={() => setShowListMenu(v => !v)}>+</span>
                {showListMenu && (
                  <div className="list-dropdown" style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}30`}}>
                    {userLists.map(lst => (
                      <button key={lst.id} className="list-dropdown-item" style={{color: textColor}} onClick={() => handleAddToList(lst.id)}>
                        {lst.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="movie-nav">
              {nextMovie && (
                <div className="btn-movie-page-wrapper">
                  <span className="btn-movie-page btn-nav btn-nav-next" onClick={() => goToMovie(nextMovie.id)}>▸</span>
                </div>
              )}
            </div>
            <button className="random-btn" onClick={handleRandomMovie}>
              🎲
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div className="row main_container mt-1">

          {/* POSTER */}
          <div className="col-12 col-md-4 left text-start">
            <img
              className="img-fluid"
              src={posterUrl}
              alt={movie.title}
            />
          </div>

          {/* RIGHT SIDE */}
          <div className="col-md-8 right">
            <div className="row h-100">

              {/* INFOS */}
              <div className="col-lg-6 infos_container text-start">

                {movie.status !== 'Released' && (
                  <p style={{color: 'red', fontWeight: 'bold'}}>
                    {movie.status}
                  </p>
                )}

                {movie.status !== 'Released' && movie.release_date && (
                  <p>
                    Release date : <strong>{movie.release_date}</strong>
                  </p>
                )}

                {/* GENRES */}
                <div className="genres d-flex flex-wrap gap-2 mt-4">
                  {movie.genre_ids?.map((g, i) => (
                    <span key={i} className="genre" style={{color: textColor}}>
                      {renderGenre(g)}
                    </span>
                  ))}
                </div>

                {movie.vote_average > 0 && (
                  <p className="mt-4"><StarRating value={movie.vote_average} /></p>
                )}

                {/* SYNOPSIS */}
                {movie.overview && (
                  <p className="mt-2">
                    <strong style={{textDecoration: 'underline'}}>
                      Synopsis
                    </strong>{' '}
                    : {movie.overview}
                  </p>
                )}
                {/* BUDGET */}
                {movie.budget && (
                  <p><strong>Budget</strong> : {movie.budget} $</p>
                )}

                <p>
                  <strong>Casting</strong> : {movie.actors}
                </p>

                <p>
                  <strong>Réalisateur</strong> : {movie.directors}
                </p>

                {/* PRODUCTION LOGOS */}
                <div className="row prods align-items-center justify-content-between p-2 mt-1">
                  {movie.production_companies?.map((p, i) =>
                    p.logo_path ? (
                      <img
                        key={i}
                        src={`https://image.tmdb.org/t/p/w500${p.logo_path}`}
                        alt={p.name}
                        style={{maxWidth: 90}}
                        className="img-fluid p-1"
                      />
                    ) : null
                  )}
                </div>
              </div>

              {/* LINKS */}
              <div className="col-lg-6 links_container mt-lg-0">
                <div className="d-flex justify-content-center align-items-center mt-5 mb-3">
                  <a
                    href={`https://www.youtube.com/results?search_query=${movie.title} bande annonce vf`}
                    target="_blank"
                    title="Bande-annonce"
                    rel="noreferrer"
                    className="me-3"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}
                  >
                    <FontAwesomeIcon icon={faYoutube} size="2x"/>
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${movie.title}+film`}
                    target="_blank"
                    rel="noreferrer"
                    title="Fiche Google"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}
                  >
                    <FontAwesomeIcon icon={faGoogle} size="2x"/>
                  </a>
                </div>

                <div className="where-to-watch-desktop">
                  {renderStreamingOffers()}
                  {!movie.is_tv && (
                    <a href="https://www.avobiv.com" target="_blank" rel="noreferrer"
                      style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                      Chercher sur Avobiv
                    </a>
                  )}
                  <a href="https://papadustream.garden/" target="_blank" rel="noreferrer"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                    Chercher sur papadustream
                  </a>
                  <a href="https://movielair.cc/" target="_blank" rel="noreferrer"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                    Chercher sur Movielair
                  </a>
                  {yts1 && !movie.is_tv && (
                    <>
                      <a href={yts1} target="_blank" rel="noreferrer" className="mt-3"
                        style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                        Voir ou download sur YTS
                      </a>
                      <a href={yts2} target="_blank" rel="noreferrer"
                        style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                        Voir ou download sur YTS 2
                      </a>
                      <div className="d-flex align-items-center gap-3">
                        <a href={`https://fr.my-subs.net/search.php?key=${movie.title}`} target="_blank" rel="noreferrer"
                          style={{minWidth: 130, background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                          Sous-titres
                        </a>
                        <a href={`https://yts-subs.com/search/${movie.title}`} target="_blank" rel="noreferrer"
                          style={{minWidth: 130, background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                          Sous-titres 2
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* TABS */}
      {(movie.filepath_set?.length > 0 || similarByDirector.length > 0 || similarByActor.length > 0 || similarByKeyword.length > 0 || true) && (
        <div className="tabs-section container mt-3">
          <div className="tabs-header" style={{borderBottom: `1px solid ${textColor}30`}}>
            {movie.filepath_set?.length > 0 && (
              <button
                className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`}
                style={{color: textColor, borderBottomColor: activeTab === 'images' ? textColor : 'transparent'}}
                onClick={() => setActiveTab('images')}
              >
                Galerie
              </button>
            )}
            <button
              className={`tab-btn tab-btn-mobile-only ${activeTab === 'where' ? 'active' : ''}`}
              style={{color: textColor, borderBottomColor: activeTab === 'where' ? textColor : 'transparent'}}
              onClick={() => setActiveTab('where')}
            >
              Où regarder
            </button>
            {(similarByDirector.length > 0 || similarByActor.length > 0 || similarByKeyword.length > 0) && (
              <button
                className={`tab-btn ${activeTab === 'similar' ? 'active' : ''}`}
                style={{color: textColor, borderBottomColor: activeTab === 'similar' ? textColor : 'transparent'}}
                onClick={() => setActiveTab('similar')}
              >
                Dans ma wishlist
              </button>
            )}
            {filmography.films.length > 0 && (
              <button
                className={`tab-btn ${activeTab === 'filmography' ? 'active' : ''}`}
                style={{color: textColor, borderBottomColor: activeTab === 'filmography' ? textColor : 'transparent'}}
                onClick={() => setActiveTab('filmography')}
              >
                {filmography.director}
              </button>
            )}
            {suggestions.length > 0 && (
              <button
                className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
                style={{color: textColor, borderBottomColor: activeTab === 'suggestions' ? textColor : 'transparent'}}
                onClick={() => setActiveTab('suggestions')}
              >
                Dans le theme
              </button>
            )}
          </div>

          {activeTab === 'images' && movie.filepath_set?.length > 0 && (
            <div className="backdrops">
              {movie.filepath_set.map((fp, i) => (
                <img key={i} src={buildImageUrl(fp.file_path)} alt="backdrop"/>
              ))}
            </div>
          )}

          {activeTab === 'where' && (
            <div className="where-to-watch-tab p-4">
              {renderStreamingOffers()}
              {!movie.is_tv && (
                <a href="https://www.avobiv.com" target="_blank" rel="noreferrer"
                  style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                  Chercher sur Avobiv
                </a>
              )}
              <a href="https://papadustream.garden/" target="_blank" rel="noreferrer"
                style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                Chercher sur papadustream
              </a>
              <a href="https://movielair.cc/" target="_blank" rel="noreferrer"
                style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                Chercher sur Movielair
              </a>
              {yts1 && !movie.is_tv && (
                <>
                  <a href={yts1} target="_blank" rel="noreferrer"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                    Voir ou download sur YTS
                  </a>
                  <a href={yts2} target="_blank" rel="noreferrer"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                    Voir ou download sur YTS 2
                  </a>
                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <a href={`https://fr.my-subs.net/search.php?key=${movie.title}`} target="_blank" rel="noreferrer"
                      style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                      Sous-titres
                    </a>
                    <a href={`https://yts-subs.com/search/${movie.title}`} target="_blank" rel="noreferrer"
                      style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}>
                      Sous-titres 2
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'similar' && (
            <div className="similar-movies-section p-4" style={{color: textColor}}>
              {similarByDirector.length > 0 && (
                <div className="similar-group mb-4">
                  <h5 className="similar-title">De {movie.directors}</h5>
                  <div className="similar-cards-row">
                    {similarByDirector.map(m => (
                      <MovieCard key={m.id} movie={m} from="similar" movieList={similarByDirector}/>
                    ))}
                  </div>
                </div>
              )}
              {similarByKeyword.length > 0 && (
                <div className="similar-group mb-4">
                  <h5 className="similar-title">
                    Thèmes similaires
                    <span className="similar-keywords">({similarByKeyword.flatMap(m => m.shared_keywords || []).filter((k, i, a) => a.indexOf(k) === i).join(', ')})</span>
                  </h5>
                  <div className="similar-cards-row">
                    {similarByKeyword.map(m => (
                      <MovieCard key={m.id} movie={m} from="similar" movieList={similarByKeyword}/>
                    ))}
                  </div>
                </div>
              )}
              {similarByActor.length > 0 && (
                <div className="similar-group">
                  <h5 className="similar-title">Avec les mêmes acteurs</h5>
                  <div className="similar-cards-row">
                    {similarByActor.map(m => (
                      <MovieCard key={m.id} movie={m} from="similar" movieList={similarByActor}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'filmography' && filmography.films.length > 0 && (
            <div className="suggestions-section p-4" style={{color: textColor}}>
              <div className="similar-cards-row">
                {filmography.films.map((s) => (
                  <div key={s.movie_id} className="suggestion-card">
                    {s.poster_path
                      ? <img src={`https://image.tmdb.org/t/p/w300${s.poster_path}`} alt={s.title} />
                      : <div className="suggestion-no-poster" />
                    }
                    <div className="suggestion-info">
                      <span className="suggestion-title">{s.title}</span>
                      <span className="suggestion-meta">
                        {s.release_date?.slice(0, 4)} · ⭐ {s.vote_average}
                      </span>
                      {!s.in_list && (
                        <button
                          className="suggestion-add-btn"
                          style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}50`}}
                          onClick={() => movieService.addMovie(s.movie_id, false).then(() => {
                            setFilmography(prev => ({
                              ...prev,
                              films: prev.films.map(f => f.movie_id === s.movie_id ? {...f, in_list: true} : f)
                            }));
                          }).catch(() => {})}
                        >
                          + Ajouter
                        </button>
                      )}
                      {s.in_list && (
                        <span className="suggestion-in-list">✓ Dans ma liste</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'suggestions' && suggestions.length > 0 && (
            <div className="suggestions-section p-4" style={{color: textColor}}>
              <div className="similar-cards-row">
                {suggestions.map((s) => (
                  <div key={s.movie_id} className="suggestion-card">
                    {s.poster_path
                      ? <img src={`https://image.tmdb.org/t/p/w300${s.poster_path}`} alt={s.title} />
                      : <div className="suggestion-no-poster" />
                    }
                    <div className="suggestion-info">
                      <span className="suggestion-title">{s.title}</span>
                      <span className="suggestion-meta">
                        {s.release_date?.slice(0, 4)} · ⭐ {s.vote_average}
                      </span>
                      <button
                        className="suggestion-add-btn"
                        style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}50`}}
                        onClick={() => movieService.addMovie(s.movie_id, false).then(() => {
                          setSuggestions(prev => prev.filter(x => x.movie_id !== s.movie_id));
                        }).catch(() => {
                          setSuggestions(prev => prev.filter(x => x.movie_id !== s.movie_id));
                        })}
                      >
                        + Ajouter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {listToast.show && (
        <div className="list-toast" style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}30`}}>
          {listToast.type === 'success' ? '✓ ' : '✕ '}{listToast.message}
        </div>
      )}
    </div>
  );

}

export default MovieDetailPage;
