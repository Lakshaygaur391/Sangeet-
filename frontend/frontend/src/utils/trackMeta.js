export const getTrackDisplayInfo = ({ currentSong, playlistSong, fallbackVideoId }) => {
  const song = currentSong || playlistSong || {};
  const title = song.title || song.name || 'Playing Song';
  const artist = song.artist || song.singer || '';
  const thumbnail =
    song.thumbnail_url ||
    song.image ||
    (fallbackVideoId ? `https://img.youtube.com/vi/${fallbackVideoId}/mqdefault.jpg` : '');

  return {
    title: artist ? `${title} - ${artist}` : title,
    thumbnail,
  };
};
