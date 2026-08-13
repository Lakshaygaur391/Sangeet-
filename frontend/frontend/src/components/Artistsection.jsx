import React, { useState, useEffect } from "react";
import axios from "axios";
import { usePlayer } from "./playerContext";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ArtistContainer = () => {
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const { setCurrentVideoId, setCurrentIndex, setSongList } = usePlayer();

  useEffect(() => {
    axios
      .get(`${API}/api/artists`)
      .then((res) => {
        // Adjust this if your backend returns { artists: [...] }
        setArtists(res.data.artists || res.data);
      })
      .catch((err) => console.error("Error fetching artists:", err));
  }, []);

  const handleArtistClick = (artist) => {
    setSelectedArtist(selectedArtist?.id === artist.id ? null : artist);
    if (artist.songs) setSongList(artist.songs);
  };

  const handleSongClick = (song, index) => {
    const videoId = song.youtube_url.split("v=")[1]?.split("&")[0];
    setCurrentVideoId(videoId);
    setCurrentIndex(index);
  };

  const getThumbnail = (youtubeUrl) => {
    const id = youtubeUrl.split("v=")[1]?.split("&")[0];
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Artists</h2>

      {/* Artist List */}
      <div className="flex gap-5 overflow-x-auto mb-6 no-scrollbar">
        {artists.map((artist) => (
          <div
            key={artist._id || artist.id}
            onClick={() => handleArtistClick(artist)}
            className={`cursor-pointer bg-neutral-800 rounded-2xl p-3 w-32 text-center hover:bg-neutral-700 transition-all ${
              selectedArtist?.id === artist.id ? "ring-2 ring-amber-400" : ""
            }`}
          >
            <img
              src={artist.image}
              alt={artist.name}
              className="w-full h-28 object-cover rounded-xl mb-2"
            />
            <p className="text-sm font-semibold text-white truncate">
              {artist.name}
            </p>
          </div>
        ))}
      </div>

      {/* Selected Artist Songs */}
      {selectedArtist && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            {selectedArtist.name}'s Songs
          </h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {(selectedArtist.songs || []).map((song, index) => (
              <div
                key={song._id || index}
                onClick={() => handleSongClick(song, index)}
                className="bg-neutral-900 text-white rounded-2xl shadow-lg hover:scale-105 transition-transform cursor-pointer w-40"
              >
                <img
                  src={getThumbnail(song.youtube_url)}
                  alt={song.title}
                  className="w-full h-36 object-cover rounded-t-2xl"
                />
                <div className="p-2 text-center">
                  <p className="text-sm font-semibold truncate">{song.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistContainer;
