import { Link } from 'react-router-dom';
import './MovieCard.css';

function MovieCard({ movie, clickable = true }) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.png';

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : '';

  const content = (
    <div
      className="movie-poster"
      style={{
        backgroundImage: `url(${posterUrl})`,
        borderColor: movie.dominant_color || '#333',
      }}
    >
      <div className="movie-overlay">
        <h3 className="movie-title">{movie.title}</h3>
        {year && <p className="movie-year">{year}</p>}
      </div>
    </div>
  );

  return clickable ? (
    <Link to={`/movie/${movie.id}`} className="movie-card">
      {content}
    </Link>
  ) : (
    <div className="movie-card not-clickable">
      {content}
    </div>
  );
}

export default MovieCard;
