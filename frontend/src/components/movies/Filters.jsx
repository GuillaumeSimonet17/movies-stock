import {useState, useRef, useEffect} from 'react';
import './Filters.css';

const TYPE_OPTIONS = [
  {value: 'Movies', label: 'Films'},
  {value: 'Series', label: 'Séries'},
];

function Filters({onFilterChange, availableGenres, currentFilters}) {
  const [showGenres, setShowGenres] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState(false);
  const [searchText, setSearchText] = useState(currentFilters.search || '');

  const genresRef = useRef(null);

  useEffect(() => {
    setSearchText(currentFilters.search || '');
  }, [currentFilters.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (genresRef.current && !genresRef.current.contains(event.target)) setShowGenres(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (type, value) => {
    onFilterChange({
      ...currentFilters,
      [type]: value,
    });
  };

  const getGenreLabel = () => {
    if (!currentFilters.genre || currentFilters.genre === 'all' || currentFilters.genre === 'All') return 'Tous les genres';
    return currentFilters.genre;
  };

  const handleResetFilters = () => {
    setSearchText('');

    onFilterChange({
      genre: 'All',
      is_tv: 'All',
      search: ''
    });

    setShowGenres(false);
  };

  const renderFilters = () => (
    <>
      {/* TYPE TABS */}
      <div className="filter-type-tabs">
        {TYPE_OPTIONS.map(option => (
          <button
            key={option.value}
            className={`filter-type-tab ${(currentFilters.is_tv || 'All') === option.value ? 'active' : ''}`}
            onClick={() => handleFilterChange('is_tv', option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* GENRES */}
      <div className="filter-section" ref={genresRef}>
        <div
          className="filter-toggle"
          onClick={() => setShowGenres(!showGenres)}
        >
          <span>{getGenreLabel()}</span>
          <span className={`chevron ${showGenres ? 'rotated' : ''}`}>▼</span>
        </div>

        {showGenres && (
          <ul className="filter-dropdown">
            <li
              onClick={() => handleFilterChange('genre', 'All')}
              className={!currentFilters.genre || currentFilters.genre === 'All' ? 'active' : ''}
            >
              Tous les genres
            </li>

            {availableGenres.map(genre => (
              <li
                key={genre.id}
                onClick={() => handleFilterChange('genre', genre.name)}
                className={currentFilters.genre === genre.name ? 'active' : ''}
              >
                {genre.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="filters-search">
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();

              handleFilterChange('search', searchText);
            }
          }}
        />
      </div>

      <button className="reset-btn" onClick={handleResetFilters}>
        Réinitialiser
      </button>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <div className="filters-container desktop-filters">
        {renderFilters()}
      </div>

      {/* Mobile accordion */}
      <div className="filters-accordion mobile-filters w-100">
        <div
          className="accordion-header"
          onClick={() => setMobileAccordionOpen(!mobileAccordionOpen)}
        >
          <span className="accordion-title">Filtres</span>
          <span className={`accordion-chevron ${mobileAccordionOpen ? 'rotated' : ''}`}>▼</span>
        </div>

        {mobileAccordionOpen && (
          <div className="accordion-content">
            {renderFilters()}
          </div>
        )}
      </div>
    </>
  );
}

export default Filters;
