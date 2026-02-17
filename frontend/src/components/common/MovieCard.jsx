import {useNavigate} from 'react-router-dom';
import './MovieCard.css';

function MovieCard({movie, movieList = [], clickable = true, from}) {
  const navigate = useNavigate();

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.png';

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : '';

  const getTitleSizeClass = (title) => {
    const longestWord = title.split(' ').reduce((a, b) =>
      a.length > b.length ? a : b, ''
    );

    if (longestWord.length > 15) return 'x-small';
    if (longestWord.length > 8 || title.length > 30) return 'medium';
    return '';
  };

  const openMovie = () => {
    if (!clickable) return;

    navigate(`/movie/${movie.id}`, {
      state: {
        movieList
      }
    });
  };

  const cardClass =
    from === 'watched' ? 'watched-card' : 'movie-card';

  const content = (
    <div
      className={from === "home" ? "movie-poster" : "watched-poster"}
      style={{
        backgroundImage: `url(${posterUrl})`,
        borderColor: movie.dominant_color || '#333',
      }}
    >
      <div className="movie-overlay">
        <h3 className={`movie-title ${getTitleSizeClass(movie.title)}`}>
          {movie.title}
        </h3>
        {year && <p className="movie-year">{year}</p>}
      </div>
    </div>
  );

  return (
    <div
      className={`${cardClass} ${!clickable ? 'not-clickable' : ''}`}
      onClick={openMovie}
      style={{cursor: clickable ? 'pointer' : 'default'}}
    >
      {content}
    </div>
  );
}

export default MovieCard;
