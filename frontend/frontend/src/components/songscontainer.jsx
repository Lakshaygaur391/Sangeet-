import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { usePlayer } from "./playerContext";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getVideoId = (url) => {
  if (!url) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;

  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
};

const SongsContainer = () => {
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { setCurrentVideoId, searchQuery, songList, setSongList, setCurrentIndex } = usePlayer();

  useEffect(() => {
    if (songList && songList.length > 0) {
      setSongs(songList);
      setIsLoading(false);
      return;
    }

    axios
      .get(`${API}/api/songs`)
      .then((res) => {
        setSongs(res.data);
        setSongList(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching songs:", err);
        setIsLoading(false);
      });
  }, [songList, setSongList]);

  // Fetch Artists
  useEffect(() => {
    axios
      .get(`${API}/api/artists`)
      .then((res) => setArtists(res.data))
      .catch((err) => console.error("Error fetching artists:", err));
  }, []);

  // Filter songs by search
  const searchText = (searchQuery || "").toLowerCase();
  const filteredSongs = songs.filter((song) =>
    (song?.title || "").toLowerCase().includes(searchText)
  );

  const EnglishSongs = filteredSongs.filter((song) => song.language === "English");
  const PunjabiSongs = filteredSongs.filter((song) => song.language === "Punjabi");
  const HaryanviSongs = filteredSongs.filter((song) => song.language === "Haryanvi");
  const BhojpuriSongs = filteredSongs.filter((song) => song.language === "Bhojpuri");

const DEFAULT_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231f1f23'/%3E%3Cstop offset='100%25' stop-color='%230f0f12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%232a2a30'/%3E%3Cpath d='M190 170v60l50-30z' fill='%23f59e0b'/%3E%3C/svg%3E";

const getThumbnailUrl = (youtubeUrl) => {
  const videoId = getVideoId(youtubeUrl);
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : DEFAULT_THUMBNAIL;
};

  const handleSongClick = async (song, index) => {
    const existingUrl = song?.youtube_url || song?.videoUrl || "";
    let videoId = getVideoId(existingUrl);
    let resolvedData = null;

    if (!videoId && song?.title && song?.artist) {
      try {
        const res = await axios.get(`${API}/api/resolve-song`, {
          params: {
            title: song.title,
            artist: song.artist,
          },
        });
        resolvedData = res.data;
        videoId = getVideoId(res.data?.youtube_url || res.data?.videoId || "");
      } catch (err) {
        console.error("Unable to resolve song from search:", err);
        return;
      }
    }

    if (!videoId) return;

    if (resolvedData) {
      const updateSongItem = (item) => {
        if (
          (item._id && song._id && item._id === song._id) ||
          (item.title === song.title && item.artist === song.artist)
        ) {
          return {
            ...item,
            youtube_url: resolvedData.youtube_url,
            thumbnail_url: resolvedData.thumbnail_url,
          };
        }
        return item;
      };

      setSongs((prev) => prev.map(updateSongItem));
      setSongList((prev) => (Array.isArray(prev) ? prev.map(updateSongItem) : prev));
    }

    setCurrentVideoId(videoId);
    setCurrentIndex(index);
  };

  const renderSongCards = (songList) =>
    songList.map((song, index) => {
      const plainSong = song?._doc || song || {};
      const songTitle = plainSong.title || song?.title || song?.name || "Unknown Song";
      const artistName = plainSong.artist || song?.artist || song?.singer || "Unknown Artist";
      const videoId = getVideoId(plainSong.youtube_url || song?.youtube_url || song?.videoUrl || "");
      const imageSrc = plainSong.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : (plainSong.image || DEFAULT_THUMBNAIL));

      return (
        <div
          key={plainSong._id || song?._id || song?.id || `${songTitle}-${artistName}-${index}`}
          onClick={() => handleSongClick(song, index)}
          className="group w-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] text-white shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10"
        >
          <img
            src={imageSrc}
            alt={songTitle}
            className="h-32 w-full object-cover sm:h-36 md:h-40"
          />
          <div className="space-y-1 px-3 py-3 text-left">
            <p className="truncate text-sm font-semibold text-white sm:text-base">{songTitle}</p>
            <p className="truncate text-xs text-gray-400 sm:text-sm">{artistName}</p>
          </div>
        </div>
      );
    });

  const renderSkeletonCards = () =>
    Array.from({ length: 10 }).map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="w-full animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a]"
      >
        <div className="h-32 w-full bg-white/5 sm:h-36 md:h-40" />
        <div className="space-y-2 px-3 py-3">
          <div className="h-3 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
        </div>
      </div>
    ));

  const renderArtists = () =>
    artists.map((artist) => (
      <button
        type="button"
        key={artist.id || artist.name}
        onClick={() => navigate(`/artist/${encodeURIComponent(artist.name.trim())}`)}
        className="w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] text-left text-white shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 sm:w-36 md:w-40"
      >
        <img
          src={artist.image}
          alt={artist.name}
          className="h-28 w-full object-cover sm:h-32 md:h-36"
        />
        <div className="px-3 py-2 text-center">
          <p className="truncate text-sm font-semibold sm:text-base">{artist.name}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{(artist.songs || []).length} songs</p>
        </div>
      </button>
    ));

  return (
    <div className="m-0 w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#121212] px-3 py-4 shadow-2xl shadow-black/30 md:m-2 md:h-[90vh] md:w-[72%] lg:w-[68%]">
      <div className="space-y-4 md:space-y-6">
        {/* 🎤 Artists Section */}
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-lg shadow-black/20">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold text-white">Artists</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto px-1 py-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {renderArtists()}
          </div>
        </div>

        {/* 🎵 All Songs */}
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-lg shadow-black/20">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold text-white">All Songs</h2>
          </div>

          {isLoading ? (
            <div className="max-h-[360px] overflow-y-auto pr-1 md:max-h-[560px]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {renderSkeletonCards()}
              </div>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#1a1a1a] text-sm text-gray-400">
              No songs found for this search.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent md:max-h-[560px]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {renderSongCards(filteredSongs)}
              </div>
            </div>
          )}
        </div>

        {/* 🎶 Punjabi */}
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-lg shadow-black/20">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold text-white">Punjabi Songs</h2>
          </div>
          <div className="max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent md:max-h-[560px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {renderSongCards(PunjabiSongs)}
            </div>
          </div>
        </div>

        {/* 🎶 Haryanvi */}
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-lg shadow-black/20">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold text-white">Haryanvi Songs</h2>
          </div>
          <div className="max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent md:max-h-[560px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {renderSongCards(HaryanviSongs)}
            </div>
          </div>
        </div>

        {/* 🎶 Bhojpuri */}
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-lg shadow-black/20">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold text-white">Bhojpuri Songs</h2>
          </div>
          <div className="max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent md:max-h-[560px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {renderSongCards(BhojpuriSongs)}
            </div>
          </div>
        </div>

        {/* 🎶 English */}
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-lg shadow-black/20">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold text-white">English Songs</h2>
          </div>
          <div className="max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent md:max-h-[560px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {renderSongCards(EnglishSongs)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongsContainer;
