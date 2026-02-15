// TMDB Genre ID to Name mapping
export const GENRE_NAMES = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV genres
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics"
};


export const getGenreName = (id) => {
  // Handle null/undefined
  if (id == null) return "Unknown";

  const idString = String(id);
  const idLower = idString.toLowerCase();

  if (idLower === "latest") return "Derniers ajouts";
  if (idLower === "no genre") return "Sans genre";

  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return idString;
  }

  return GENRE_NAMES[numericId] || "Unknown";
};
