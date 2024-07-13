$(document).ready(function() {
    let movieSearchInput = $('#search_input');
    let moviesRes = $('#movies_results')
    let searchContainer = $('.search_container')
    $(document).on('keydown', function(event) {
        if (event.key === 'Escape' && movieSearchInput.val().length > 0) {
            show_or_hide_search(movieSearchInput, searchContainer, 0)
        }
        if (isValidKey(event.key)) {
            movieSearchInput.focus();
            show_or_hide_search(movieSearchInput, searchContainer, 1)
        }
    });

    movieSearchInput.on('input', function() {

        if (movieSearchInput.val().length > 0)
            searchMovies(movieSearchInput.val());
        else {
            moviesRes.empty()
            show_or_hide_search(movieSearchInput, searchContainer, 0)
        }
    });

    let toggle_genres = $('#toggle_genres')
    let genres_list = $('#genres_list')
    let toggle_ordered = $('#toggle_ordered')
    let ordered_list = $('#ordered_list')

    let show_genres_list = $('.show_genres_list')
    let show_ordered_list = $('.show_ordered_list')

    toggle_genres.click(function() {
        if (ordered_list.hasClass('show_ordered_list'))
            ordered_list.toggleClass('show_ordered_list');
        genres_list.toggleClass('show_genres_list');
    });
    toggle_ordered.click(function() {
        if (genres_list.hasClass('show_genres_list'))
            genres_list.toggleClass('show_genres_list');
         ordered_list.toggleClass('show_ordered_list');
    });
});

function isValidKey(key) {
    return /^[a-zA-Z0-9]$/.test(key);
}

function searchMovies(query) {
    $.ajax({
        url: '/search_movies/',
        method: 'GET',
        data: { query: query },
        success: function(response) {
            displayMovies(response.results);
        },
        error: function(xhr, status, error) {
            console.error('Error fetching movies:', error);
        }
    });
}

function displayMovies(movies) {
    let resultsContainer = document.getElementById('movies_results');
    resultsContainer.innerHTML = '';
    let limitedMovies = movies.slice(0, 5);
    let movieSearchInput = $('#search_input');
    let searchContainer = $('.search_container')

    limitedMovies.forEach(function(movie) {
        let movieElement = document.createElement('div');
        movieElement.id = 'res_container';

        if (movie.poster_path) {
            let imageUrl = movie.poster_path ? 'https://image.tmdb.org/t/p/w500' + movie.poster_path : 'placeholder_image_url';

            movieElement.innerHTML = '<img class="res_img" src="' + imageUrl + '" alt="' + movie.title + '"> <p class="res_title">' + movie.title + '</p>';
            resultsContainer.appendChild(movieElement);

            $(movieElement).on('click', function() {
                $.ajax({
                    url: '/add_movie/',
                    method: 'POST',
                    data: { id: movie.id },
                    success: function(response) {
                        console.log('Réponse du serveur :', response);
                        resultsContainer.innerHTML = '';
                        window.location.href = '/';
                        get_images(response.movie_id)
                    },
                    error: function(xhr, status, error) {
                        console.error('Erreur lors de la requête :', error);
                    }
                });
            });
        }
    });
}

function get_images(movieId) {
    $.ajax({
        url: '/get_images/',
        method: 'GET',
        data: { movie_id: movieId },
        success: function(response) {
            console.log('Réponse du serveur :', response.message);
        },
        error: function(xhr, status, error) {
            console.error('Erreur lors de la requête :', error);
        }
    });
}


function show_or_hide_search(movieSearchInput, searchContainer, to_show) {
    if (to_show) {
        movieSearchInput.css('opacity', '1');
        searchContainer.css('opacity', '1');
    } else {
        if (window.innerWidth > 480) {
            movieSearchInput.css('opacity', '0');
            searchContainer.css('opacity', '0');
        }
        movieSearchInput.empty()
        movieSearchInput.val('');
    }
}
