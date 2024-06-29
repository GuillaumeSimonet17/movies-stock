$(document).ready(function() {
    let movieSearchInput = $('#search_input');
    let moviesRes = $('#movies_results')
    let searchContainer = $('.search_container')
    $(document).on('keydown', function(event) {
        if (isValidKey(event.key)) {
            movieSearchInput.focus();
            movieSearchInput.css('opacity', '1');
            searchContainer.css('opacity', '1');
        }
    });

    movieSearchInput.on('input', function() {
        if (movieSearchInput.val().length > 0)
            searchMovies(movieSearchInput.val());
        else {
            moviesRes.empty()
            movieSearchInput.css('opacity', '0');
            searchContainer.css('opacity', '0');
        }
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
    console.log('====> ', movies)
    let resultsContainer = document.getElementById('movies_results');
    resultsContainer.innerHTML = '';
     let limitedMovies = movies.slice(0, 5);

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
                        console.log('Réponse du serveur :', response.message);
                    },
                    error: function(xhr, status, error) {
                        console.error('Erreur lors de la requête :', error);
                    }
                });
            });
        }
    });
}