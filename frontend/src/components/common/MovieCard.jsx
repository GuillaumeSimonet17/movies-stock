import {Link} from 'react-router-dom';
import CardMenu from './CardMenu';
import './MovieCard.css';

function MovieCard({movie, movieList = [], clickable = true, from, extraState = {}, showMenu = false}) {
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

  const cardClass =
    from === 'watched' ? 'watched-card' : 'movie-card';

  const posterClass =
    from === 'home' ? 'movie-poster'
    : from === 'similar' ? 'similar-poster'
    : 'watched-poster';

  const poster = (
    <div
      className={posterClass}
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

  const content = showMenu ? (
    <div className="movie-card-menu-wrap">
      {poster}
      <CardMenu movie={movie} />
    </div>
  ) : poster;

  return clickable ? (
    <Link
      to={`/movie/${movie.id}`}
      state={{movieList, ...extraState}}
      className={`${cardClass} ${!clickable ? 'not-clickable' : ''}`}
    >
      {content}
    </Link>
  ) : (
    <div className={`${cardClass} not-clickable`}>
      {content}
    </div>
  );
}

export default MovieCard;
