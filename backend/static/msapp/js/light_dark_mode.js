$(document).ready(function() {
    // Charger le mode depuis localStorage
    if (localStorage.getItem('mode') === 'dark') {
        $('body').removeClass('light-mode').addClass('dark-mode');
    } else {
        $('body').removeClass('dark-mode').addClass('light-mode');
    }

    $('#mode-toggle').on('click', function() {
        if ($('body').hasClass('light-mode')) {
            $('body').removeClass('light-mode').addClass('dark-mode');
            localStorage.setItem('mode', 'dark');
        } else {
            $('body').removeClass('dark-mode').addClass('light-mode');
            localStorage.setItem('mode', 'light');
        }
    });
});
