$(document).ready(function () {
    /* ================= SEARCH ================= */
    let movieSearchInput = $('#search_input');
    let moviesRes = $('#movies_results');
    let searchContainer = $('.search_container');

    // Keydown global
    $(document).on('keydown', function (event) {
        if (event.key === 'Escape') {
            show_or_hide_search(movieSearchInput, searchContainer, moviesRes, 0);
        }
        if (isValidKey(event.key)) {
            movieSearchInput.focus();
            show_or_hide_search(movieSearchInput, searchContainer, moviesRes, 1);
        }
    });

    // Input search
    movieSearchInput.on('input', function () {
        if (movieSearchInput.val().length > 0) {
            searchMovies(movieSearchInput.val());
            show_or_hide_search(movieSearchInput, searchContainer, moviesRes, 1);
        } else {
            moviesRes.empty();
            show_or_hide_search(movieSearchInput, searchContainer, moviesRes, 0);
        }
    });

    /* ================= FILTERS (DESKTOP + MOBILE) ================= */
    function initFilters(toggleGenres, genresList, toggleOrdered, orderedList) {
        // Toggle genres
        toggleGenres.on('click', function (e) {
            e.stopPropagation();
            orderedList.removeClass('show_ordered_list');
            orderedList.removeClass('show_ordered_list_mobile');
            genresList.toggleClass('show_genres_list');
            genresList.toggleClass('show_genres_list_mobile');
        });

        // Toggle ordered
        toggleOrdered.on('click', function (e) {
            e.stopPropagation();
            genresList.removeClass('show_genres_list');
            genresList.removeClass('show_genres_list_mobile');
            orderedList.toggleClass('show_ordered_list');
            orderedList.toggleClass('show_ordered_list_mobile');
        });

        // Empêche la fermeture au clic sur les listes
        genresList.on('click', function (e) {
            e.stopPropagation();
        });
        orderedList.on('click', function (e) {
            e.stopPropagation();
        });
    }

    // DESKTOP
    initFilters(
        $('#toggle_genres'),
        $('#genres_list'),
        $('#toggle_ordered'),
        $('#ordered_list')
    );

    // MOBILE
    initFilters(
        $('#toggle_genres_mobile'),
        $('#genres_list_mobile'),
        $('#toggle_ordered_mobile'),
        $('#ordered_list_mobile')
    );

    /* ================= CLIC HORS DROPDOWN ================= */
    $(document).on('click', function (e) {
        $('.show_genres_list').removeClass('show_genres_list');
        $('.show_ordered_list').removeClass('show_ordered_list');
    });
});

/* ================= VALIDATION CLÉ ================= */
function isValidKey(key) {
    return /^[a-zA-Z0-9]$/.test(key);
}

/* ================= AJAX SEARCH ================= */
function searchMovies(query) {
    $.ajax({
        url: '/search_movies/',
        method: 'GET',
        data: {query: query},
        success: function (response) {
            displayMovies(response.results);
        },
        error: function (xhr, status, error) {
            console.error('Error fetching movies:', error);
        }
    });
}

function displayMovies(movies) {
    let resultsContainer = $('#movies_results');
    resultsContainer.empty();

    let limitedMovies = movies.slice(0, 15);

    limitedMovies.forEach(function (movie) {
        if (!movie.poster_path) return;

        let imageUrl = 'https://image.tmdb.org/t/p/w500' + movie.poster_path;
        let movieElement = $('<div>', {class: 'col-6 col-lg-2 mt-3', id: 'res_container'});

        movieElement.html(`
            <img class="img-fluid" src="${imageUrl}" alt="${movie.title}">
            <p class="text-truncate p-2 mt-3 fs-5">${movie.title}</p>
        `);

        movieElement.on('click', function () {
            $.ajax({
                url: '/add_movie/',
                method: 'POST',
                data: {id: movie.id},
                success: function (response) {
                    console.log('Réponse du serveur :', response);
                    resultsContainer.empty();
                    window.location.href = '/';
                    get_images(response.movie_id);
                },
                error: function (xhr, status, error) {
                    console.error('Erreur lors de la requête :', error);
                }
            });
        });

        resultsContainer.append(movieElement);
    });
}

/* ================= AJAX GET IMAGES ================= */
function get_images(movieId) {
    $.ajax({
        url: '/get_images/',
        method: 'GET',
        data: {movie_id: movieId},
        success: function (response) {
            console.log('Réponse du serveur :', response.message);
        },
        error: function (xhr, status, error) {
            console.error('Erreur lors de la requête :', error);
        }
    });
}

/* ================= SHOW / HIDE SEARCH ================= */
function show_or_hide_search(movieSearchInput, searchContainer, moviesRes, to_show) {
    if (to_show) {
        movieSearchInput.css('opacity', '1');
        searchContainer.css('opacity', '1');
        moviesRes.css('display', 'flex');
    } else {
        moviesRes.empty();
        moviesRes.css('display', 'none');
        movieSearchInput.val('');
    }
}
