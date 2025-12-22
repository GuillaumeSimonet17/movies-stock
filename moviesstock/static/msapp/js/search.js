$(document).ready(function () {
    /* ================= SEARCH ================= */
   let movieInput = $('#search_input');
    let tvInput = $('#search_input_tv');
    let results = $('#movies_results');
    let searchContainer = $('.search_container');

    // ESC pour fermer
    $(document).on('keydown', function (event) {
        if (event.key === 'Escape') {
            hideSearch();
        }
    });

    /* ===== MOVIES SEARCH ===== */
    movieInput.on('input', function () {
        let value = movieInput.val().trim();
        tvInput.val(''); // reset l’autre input

        if (value.length > 0) {
            searchTMDB('/search_movies/', value, 'movie');
            showSearch();
        } else {
            hideSearch();
        }
    });

    /* ===== TV SEARCH ===== */
    tvInput.on('input', function () {
        let value = tvInput.val().trim();
        movieInput.val('');

        if (value.length > 0) {
            searchTMDB('/search_tv/', value, 'tv');
            showSearch();
        } else {
            hideSearch();
        }
    });

    function showSearch() {
        searchContainer.css('opacity', '1');
        results.css('display', 'flex');
    }

    function hideSearch() {
        results.empty().hide();
        movieInput.val('');
        tvInput.val('');
    }

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
// function isValidKey(key) {
//     return /^[a-zA-Z0-9]$/.test(key);
// }

/* ================= AJAX SEARCH ================= */
function searchTMDB(url, query, type) {
    $.ajax({
        url: url,
        method: 'GET',
        data: { query: query },
        success: function (response) {
            displayResults(response.results, type);
        },
        error: function (err) {
            console.error('Search error:', err);
        }
    });
}


function displayResults(items, type) {
    let container = $('#movies_results');
    container.empty();

    items.slice(0, 6).forEach(item => {
        if (!item.poster_path) return;

        let title = type === 'tv' ? item.name : item.title;
        let imageUrl = 'https://image.tmdb.org/t/p/w500' + item.poster_path;

        let el = $(`
            <div class="col-6 col-lg-2 mt-3 result-card" style="cursor:pointer;">
                <img class="img-fluid" src="${imageUrl}">
                <p class="text-truncate p-2 mt-3 fs-5">${title}</p>
            </div>
        `);

        el.on('click', function () {
            $.post('/add_movie/', {
                id: item.id,
                type: type
            }).done(function (response) {
                get_images(response.movie_id, type);

                container.empty();
                window.location.href = '/';
            }).fail(function (xhr) {
                console.error('Erreur add_movie', xhr.responseText);
            });
        });

        container.append(el);
    });
}

/* ================= AJAX GET IMAGES ================= */
function get_images(movieId, type) {
    $.ajax({
        url: '/get_images/',
        method: 'GET',
        data: {movie_id: movieId, type: type},
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
