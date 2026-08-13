import React from 'react'
import { useState } from "react";
import axios from "axios";
import YouTube from "react-youtube";
const Predefinedcode = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  

  const searchSongs = async () => {
    const res = await axios.get(`http://localhost:5000/api/search?q=${query}`);
    setResults(res.data);
  };
  return (
    
        <div className="p-6 text-center">

      <h1 className="text-3xl font-bold mb-4 text-blue-400">🎵 Mini Sangeet</h1>
      <div className="mb-4">
        <input
          className="p-2 rounded text-black"
          placeholder="Search songs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="ml-2 bg-blue-500 px-4 py-2 rounded"
          onClick={searchSongs}
        >
          Search
        </button>
      </div>

      {/* Song list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 justify-center">
        {results.map((song) => (
          <div
            key={song.videoId}
            className="bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700"
            onClick={() => setCurrentVideo(song.videoId)}
          >
            <img src={song.thumbnail} alt={song.title} className="mx-auto" />
            <p className="mt-2 text-sm">{song.title}</p>
          </div>
        ))}
      </div>

      {/* YouTube Player (audio-only) */}
      {currentVideo && (
        <div className="mt-6">
          <YouTube
            videoId={currentVideo}
            opts={{
              height: "[300px]",
              width: "[300px]",
              playerVars: { autoplay: 1 },
            }}
          />
          <p className="text-green-400 mt-2">Now Playing 🎶{currentVideo.title}</p>
        </div>
      )}
    </div>
  )
}

export default Predefinedcode