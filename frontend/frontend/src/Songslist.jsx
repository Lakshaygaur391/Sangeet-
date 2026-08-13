import React, { useEffect, useState } from "react";
import axios from "axios";

const SongsList = () => {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);

  useEffect(() => {
    // Replace with your backend URL
    axios.get("http://localhost:5000/api/songs")
      .then(res => setSongs(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Sangeet Songs</h1>

      {/* Song Player */}
      {currentSong && (
        <div className="mb-4 p-2 border rounded-lg bg-gray-900 text-white">
          <h2 className="text-xl">{currentSong.title} - {currentSong.artist}</h2>
          <audio controls src={currentSong.audio_url} autoPlay className="w-full mt-2" />
        </div>
      )}

      {/* Song List */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {songs.map(song => (
          <div
            key={song.id}
            className="cursor-pointer bg-gray-800 rounded-lg p-2 hover:bg-gray-700"
            onClick={() => setCurrentSong(song)}
          >
            <img src={song.thumbnail_url} alt={song.title} className="w-full rounded" />
            <h3 className="text-white mt-2">{song.title}</h3>
            <p className="text-gray-400">{song.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongsList;
