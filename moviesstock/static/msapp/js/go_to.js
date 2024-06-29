function goToHomePage(id) {
     window.location.href = '/'
}

function goToMoviePage(id) {
     window.location.href = '/movie_page/?query=' + id;
}

function goToNextMoviePage(movies_list, id) {
     let nextId = -1;

     for (let i = 0; i < movies_list.length; i++) {
          if (movies_list[i] == id) {
               if (i + 1 < movies_list.length) {
                    nextId = movies_list[i + 1];
               }
               break;
          }
     }
     if (nextId === -1)
          nextId = movies_list[0]
     window.location.href = '/movie_page/?query=' + nextId;
}

function goToPreviousMoviePage(movies_list, id) {
     let previousId = -1;

     for (let i = 0; i < movies_list.length; i++) {
          if (movies_list[i] !== undefined && movies_list[i] == id) {
               previousId = movies_list[i - 1];
               break;
          }
     }

     if (previousId === undefined)
          previousId = movies_list[movies_list.length-1]
     window.location.href = '/movie_page/?query=' + previousId;
}
