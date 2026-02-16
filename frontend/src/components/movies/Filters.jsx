import {useState, useRef, useEffect} from 'react';
import './Filters.css';

function Filters({onFilterChange, availableGenres, currentFilters}) {
  const [showGenres, setShowGenres] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showType, setShowType] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState(false);
  const [searchText, setSearchText] = useState(currentFilters.search || '');

  const genresRef = useRef(null);
  const orderRef = useRef(null);
  const typeRef = useRef(null);

  const ORDER_OPTIONS = [
    {value: 'Date added', label: 'Date added'},
    {value: 'Year Asc', label: 'Year Asc'},
    {value: 'Year Dsc', label: 'Year Dsc'},
  ];

  const TYPE_OPTIONS = [
    {value: 'All', label: 'All'},
    {value: 'Movies', label: 'Movies'},
    {value: 'Series', label: 'Series'},
  ];

  useEffect(() => {
    setSearchText(currentFilters.search || '');
  }, [currentFilters.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (genresRef.current && !genresRef.current.contains(event.target)) setShowGenres(false);
      if (orderRef.current && !orderRef.current.contains(event.target)) setShowOrder(false);
      if (typeRef.current && !typeRef.current.contains(event.target)) setShowType(false);
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

  const getDisplayLabel = (filterType) => {
    if (filterType === 'genre') {
      if (!currentFilters.genre || currentFilters.genre === 'all') return 'All Genres';
      return currentFilters.genre;
    }

    if (filterType === 'order_by') {
      const order = ORDER_OPTIONS.find(o => o.value === currentFilters.order_by);
      return order ? order.label : 'Date added';
    }

    if (filterType === 'is_tv') {
      const type = TYPE_OPTIONS.find(t => t.value === currentFilters.is_tv);
      return type ? type.label : 'Movies and Series';
    }
  };

  const handleResetFilters = () => {
    setSearchText('');

    onFilterChange({
      genre: 'All',
      order_by: 'Date added',
      is_tv: 'All',
      search: ''
    });

    setShowGenres(false);
    setShowOrder(false);
    setShowType(false);
  };

  const renderFilters = () => (
    <>
      <div className="filters-search">
        <input
          type="text"
          placeholder="Search..."
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

      {/* TYPE */}
      <div className="filter-section" ref={typeRef}>
        <div
          className="filter-toggle"
          onClick={() => {
            setShowType(!showType);
            setShowGenres(false);
            setShowOrder(false);
          }}
        >
          <span>{getDisplayLabel('is_tv')}</span>
          <span className={`chevron ${showType ? 'rotated' : ''}`}>▼</span>
        </div>

        {showType && (
          <ul className="filter-dropdown">
            {TYPE_OPTIONS.map(option => (
              <li
                key={option.value}
                onClick={() => handleFilterChange('is_tv', option.value)}
                className={currentFilters.is_tv === option.value ? 'active' : ''}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* GENRES */}
      <div className="filter-section" ref={genresRef}>
        <div
          className="filter-toggle"
          onClick={() => {
            setShowGenres(!showGenres);
            setShowOrder(false);
            setShowType(false);
          }}
        >
          <span>{getDisplayLabel('genre')}</span>
          <span className={`chevron ${showGenres ? 'rotated' : ''}`}>▼</span>
        </div>

        {showGenres && (
          <ul className="filter-dropdown">
            <li
              onClick={() => handleFilterChange('genre', 'All')}
              className={!currentFilters.genre || currentFilters.genre === 'All' ? 'active' : ''}
            >
              All Genres
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

      {/* ORDER */}
      <div className="filter-section" ref={orderRef}>
        <div
          className="filter-toggle"
          onClick={() => {
            setShowOrder(!showOrder);
            setShowGenres(false);
            setShowType(false);
          }}
        >
          <span>{getDisplayLabel('order_by')}</span>
          <span className={`chevron ${showOrder ? 'rotated' : ''}`}>▼</span>
        </div>

        {showOrder && (
          <ul className="filter-dropdown">
            {ORDER_OPTIONS.map(option => (
              <li
                key={option.value}
                onClick={() => handleFilterChange('order_by', option.value)}
                className={currentFilters.order_by === option.value ? 'active' : ''}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button className="reset-btn" onClick={handleResetFilters}>
        Reset
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
          <span className="accordion-title">Filters</span>
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
