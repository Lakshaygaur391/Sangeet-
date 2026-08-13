import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrackDisplayInfo } from './trackMeta.js';

test('uses the selected song metadata rather than a stale playlist index', () => {
  const playingSong = {
    title: 'Correct Song Name',
    artist: 'Actual Artist',
    thumbnail_url: 'https://example.com/correct.jpg',
  };

  const staleListEntry = {
    title: 'Wrong Song Name',
    artist: 'Wrong Artist',
    thumbnail_url: 'https://example.com/wrong.jpg',
  };

  const result = getTrackDisplayInfo({
    currentSong: playingSong,
    playlistSong: staleListEntry,
    fallbackVideoId: 'dQw4w9WgXcQ',
  });

  assert.equal(result.title, 'Correct Song Name - Actual Artist');
  assert.equal(result.thumbnail, 'https://example.com/correct.jpg');
});
