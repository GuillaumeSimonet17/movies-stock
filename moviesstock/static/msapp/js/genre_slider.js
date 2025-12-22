$(document).ready(function () {
    $('.genre-container').each(function () {
        let slider = $(this).find('.genre-slider');
        let prevBtn = $(this).find('.slider-btn.prev');
        let nextBtn = $(this).find('.slider-btn.next');

        if (slider[0].scrollWidth > slider[0].clientWidth) {
            console.log('show')
            prevBtn.show();
            nextBtn.show();
        } else {
            console.log('hide')

            prevBtn.hide();
            nextBtn.hide();
        }
    });

    $('.slider-btn.next').on('click', function () {
        let slider = $(this).siblings('.genre-slider');
        let cardWidth = slider.find('.movie_card').outerWidth(true) / 2;
        let scrollAmount = slider.outerWidth() - cardWidth; // largeur visible moins une carte
        slider.animate({scrollLeft: '+=' + scrollAmount}, 500);
    });

    $('.slider-btn.prev').on('click', function () {
        let slider = $(this).siblings('.genre-slider');
        let cardWidth = slider.find('.movie_card').outerWidth(true) / 2;
        let scrollAmount = slider.outerWidth() - cardWidth;
        slider.animate({scrollLeft: '-=' + scrollAmount}, 500);
    });
});
