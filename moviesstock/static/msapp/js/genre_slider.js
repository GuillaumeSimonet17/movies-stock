$(document).ready(function () {
    $('.slider-btn.next').on('click', function () {
        let slider = $(this).siblings('.genre-slider');
        let cardWidth = slider.find('.movie_card').outerWidth(true) / 2;
        console.log('coucou', cardWidth)
        let scrollAmount = slider.outerWidth() - cardWidth; // largeur visible moins une carte
        slider.animate({ scrollLeft: '+=' + scrollAmount }, 500);
    });

    $('.slider-btn.prev').on('click', function () {
        let slider = $(this).siblings('.genre-slider');
        let cardWidth = slider.find('.movie_card').outerWidth(true) / 2;
        let scrollAmount = slider.outerWidth() - cardWidth;
        slider.animate({ scrollLeft: '-=' + scrollAmount }, 500);
    });
});
