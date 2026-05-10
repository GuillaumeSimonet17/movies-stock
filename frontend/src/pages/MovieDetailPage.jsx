import {useState, useEffect, useCallback} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import TopBar from '../components/common/TopBar';
import {movieService} from '../services/movieService';
import {watchedService} from '../services/watchedService';
import {getGenreName} from '../utils/genreMapping';
import './MovieDetailPage.css';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faYoutube, faGoogle} from '@fortawesome/free-brands-svg-icons'
import {useLocation} from 'react-router-dom';


function MovieDetailPage() {
  const location = useLocation();
  const movieList = location.state?.movieList || [];

  const {id} = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textColor, setTextColor] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(true);
  const [yts1, setYts1] = useState(true);
  const [yts2, setYts2] = useState(true);

  const currentIndex = movieList.findIndex(m => m.id === Number(id));

  const prevMovie =
    currentIndex > 0 ? movieList[currentIndex - 1] : null;

  const nextMovie =
    currentIndex < movieList.length - 1 ? movieList[currentIndex + 1] : null;

  const loadMovie = useCallback(async () => {
    setLoading(true);
    try {
      const data = await movieService.getMovieDetail(id);

      setMovie(data.movie);

      setBackgroundColor(data.background);
      setTextColor(data.text_color);
      setYts1(data.yts1)
      setYts2(data.yts2)

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
  }, [id, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadMovie();
  }, [loadMovie]);

  const goToMovie = (movieId) => {
    navigate(`/movie/${movieId}`, {
      state: {movieList}
    });
  };

  const handleMarkWatched = async () => {
    try {
      await watchedService.addToWatched(id);
      navigate('/');
    } catch (error) {
      alert(error.message || 'Failed to mark as watched');
    }
  };

  const handleDelete = async () => {
    try {
      await movieService.deleteMovie(id);
      navigate('/');
    } catch {
      console.log('Failed to delete movie');
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
        <div className="loading-container">Loading...</div>
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
    if (path.startsWith('http')) return path; // local/full URL
    return `https://image.tmdb.org/t/p/w780${path}`; // TMDB
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

          <div className="col-md-6 d-flex justify-content-end gap-3 btn_pass">
            <div className="movie-nav">
              {prevMovie && (
                <span onClick={() => goToMovie(prevMovie.id)}>
                  &lt;
                </span>
              )}
            </div>
            <span className={"btn-movie-page"} onClick={handleMarkWatched}>saw</span>
            <span className={"btn-movie-page"} onClick={handleDelete}>Nope</span>
            <div className="movie-nav">
              {nextMovie && (
                <span onClick={() => goToMovie(nextMovie.id)}>
                  &gt;
                </span>
              )}
            </div>
            <button className="random-btn ms-2" onClick={handleRandomMovie}>
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

                {/* SYNOPSIS */}
                {movie.overview && (
                  <p className="mt-4">
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
                  <strong>Director</strong> : {movie.directors}
                </p>

                {/* PRODUCTION LOGOS */}
                <div class="row prods align-items-center justify-content-center p-2 mt-1">
                  {movie.production_companies?.map((p, i) =>
                    p.logo_path ? (
                      <img
                        key={i}
                        src={`https://image.tmdb.org/t/p/w500${p.logo_path}`}
                        alt={p.name}
                        style={{maxWidth: 150}}
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
                    href={`https://www.youtube.com/results?search_query=${movie.title}bande annonce`}
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
                {!movie.is_tv && (
                  <a
                    href="https://www.avobiv.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}
                  >
                    Chercher sur Avobiv
                  </a>
                )}
                {(
                  <a
                    href="https://papadustream.credit/"
                    target="_blank"
                    rel="noreferrer"
                    style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}
                  >
                    Chercher sur papadustream
                  </a>
                )}

                <a
                  href="https://movielair.cc/"
                  target="_blank"
                  rel="noreferrer"
                  style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}
                >
                  Chercher sur Movielair
                </a>

                {yts1 && !movie.is_tv && (
                  <>
                    <a
                      href={yts1}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3"
                      style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}
                    >
                      Voir ou download sur YTS
                    </a>

                    <a
                      href={yts2}
                      target="_blank"
                      rel="noreferrer"
                      style={{background: backgroundColor, color: textColor, border: `1px solid ${textColor}`}}
                    >
                      Voir ou download sur YTS 2
                    </a>
                    <div className="d-flex align-items-center gap-3">
                      <a
                        href={`https://fr.my-subs.net/search.php?key=${movie.title}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          minWidth: 130,
                          background: backgroundColor,
                          color: textColor,
                          border: `1px solid ${textColor}`
                        }}
                      >
                        Sous-titres
                      </a>

                      <a
                        href={`https://yts-subs.com/search/${movie.title}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          minWidth: 130,
                          background: backgroundColor,
                          color: textColor,
                          border: `1px solid ${textColor}`
                        }}
                      >
                        Sous-titres 2
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BACKDROPS */}
      {movie.filepath_set?.length > 0 && (
        <div className="backdrops">
          {movie.filepath_set.map((fp, i) => (
            <img
              key={i}
              src={buildImageUrl(fp.file_path)}
              alt="backdrop"
            />
          ))}
        </div>
      )}
    </div>
  );

}

export default MovieDetailPage;
