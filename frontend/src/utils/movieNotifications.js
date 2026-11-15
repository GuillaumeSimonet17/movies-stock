export const formatShortDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

// Short text describing a movie notification (Netflix arrival, release in France)
export const movieNotifLabel = (n, today) => {
  if (n.kind === 'netflix') return 'Maintenant sur Netflix';
  if (!n.release_date || n.release_date === today) return "Sort aujourd'hui en France";
  return `Sorti en France le ${formatShortDate(n.release_date)}`;
};

export const movieNotifIcon = (n) => (n.kind === 'netflix' ? '🍿' : '🎬');
