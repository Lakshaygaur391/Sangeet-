import React, { useState, useRef, useEffect } from "react";
import YouTube from "react-youtube";
import { IoPlayForward, IoPlayBack, IoPlayCircle } from "react-icons/io5";
import { FaCirclePause } from "react-icons/fa6";
import axios from "axios";
import { usePlayer } from "./playerContext";

const Player = ({ videoId }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const playerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(true);
  const [songTitle, setSongTitle] = useState("Loading...");
  const [thumbnail, setThumbnail] = useState("");
  const { songList, currentIndex, setCurrentIndex, setCurrentVideoId } = usePlayer();
  const safeVideoId = videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;


  useEffect(() => {
    if (!safeVideoId) {
      setSongTitle("Select a song");
      setThumbnail("");
      return;
    }

    const currentSong = songList?.[currentIndex];
    const currentSongTitle = currentSong?.title || currentSong?.name;
    const currentArtist = currentSong?.artist || currentSong?.singer;

    if (currentSongTitle) {
      setSongTitle(currentArtist ? `${currentSongTitle} - ${currentArtist}` : currentSongTitle);
      const thumb = currentSong?.thumbnail_url || currentSong?.image || `https://img.youtube.com/vi/${safeVideoId}/mqdefault.jpg`;
      setThumbnail(thumb);
    } else {
      setThumbnail(`https://img.youtube.com/vi/${safeVideoId}/mqdefault.jpg`);
      setSongTitle("Playing Song");

      axios
        .get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${safeVideoId}&format=json`)
        .then((res) => {
          if (res.data?.title) setSongTitle(res.data.title);
          if (res.data?.thumbnail_url) setThumbnail(res.data.thumbnail_url);
        })
        .catch(() => {});
    }
  }, [safeVideoId, songList, currentIndex]);

  const opts = { width: "0", height: "0", playerVars: { autoplay: 1 } };

  const getSongVideoId = (song) => {
    const rawSong = song?._doc || song || {};
    const url = rawSong.youtube_url || rawSong.videoUrl || "";
    if (!url) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
    return url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1] || null;
  };

  const playSongAtIndex = (index) => {
    if (!songList || songList.length === 0 || index === null || index < 0) return;

    const safeIndex = (index + songList.length) % songList.length;
    const nextSong = songList[safeIndex];
    const nextId = getSongVideoId(nextSong);

    if (!nextId) return;

    setCurrentIndex(safeIndex);
    setCurrentVideoId(nextId);
    setIsPlaying(true);
  };

  const onReady = (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    event.target.setVolume(volume);
  };

  const onStateChange = (event) => {
    if (event.data === 0) {
      playSongAtIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (isPlaying) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
    setIsPlaying(!isPlaying);
  };


  let clickTimer = null;

  const handleNext = () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      playNextSong();
    } else {
      clickTimer = setTimeout(() => {
        handleForward();
        clickTimer = null;
      }, 250);
    }
  };

  const handlePrev = () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      playPrevSong(); 
    } else {
      clickTimer = setTimeout(() => {
        handleBackward(); 
        clickTimer = null;
      }, 250);
    }
  };

  const handleForward = () => {
    const current = playerRef.current?.getCurrentTime() || 0;
    playerRef.current?.seekTo(current + 10, true);
  };

  const handleBackward = () => {
    const current = playerRef.current?.getCurrentTime() || 0;
    playerRef.current?.seekTo(Math.max(current - 10, 0), true);
  };

  const playNextSong = () => {
    playSongAtIndex(currentIndex + 1);
  };

  const playPrevSong = () => {
    playSongAtIndex(currentIndex - 1);
  };

  const handleSeek = (e) => {
    const seekTo = e.target.value;
    playerRef.current?.seekTo(seekTo, true);
    setCurrentTime(seekTo);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

const togglePlayerSize = (event) => {
  event?.stopPropagation?.();
  setIsExpanded((prev) => !prev);
};

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div
      className={`fixed bottom-0 left-0 z-50 w-full border-t border-white/10 bg-[#121212]/95 text-white backdrop-blur-md transition-all duration-500 ${
        isExpanded ? "h-screen flex-col justify-center p-6" : "h-[96px] px-4 md:px-6"
      }`}
    >
      <div className={`mx-auto flex w-full max-w-7xl items-center justify-between gap-4 ${isExpanded ? "flex-col w-full" : "flex-row"}`}>
        {safeVideoId && <YouTube videoId={safeVideoId} opts={opts} onReady={onReady} onStateChange={onStateChange} />}

        <div className={`flex items-center ${isExpanded ? "w-full justify-center flex-col gap-4" : "w-[30%] min-w-0 gap-3"}`}>
          {thumbnail && (
            <img
              src={thumbnail}
              alt={songTitle}
              className={`rounded-xl object-cover shadow-lg ${
                isExpanded ? "h-64 w-64 md:h-80 md:w-80" : "h-12 w-12 md:h-14 md:w-14"
              }`}
            />
          )}
          <div className={`flex min-w-0 flex-col ${isExpanded ? "items-center text-center" : ""}`}>
            <span className="truncate text-sm font-semibold text-white md:text-base">{songTitle}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Sangeet Player</span>
          </div>
        </div>

        <div className={`flex flex-col items-center justify-center ${isExpanded ? "w-full max-w-2xl" : "flex-1 max-w-2xl"}`}>
          <div className="flex items-center gap-5 text-2xl text-white">
            <button
              className="rounded-full p-2 transition hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
            >
              <IoPlayBack />
            </button>

            <button
              className="rounded-full bg-white/10 p-3 transition hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
            >
              {isPlaying ? <FaCirclePause /> : <IoPlayCircle />}
            </button>

            <button
              className="rounded-full p-2 transition hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <IoPlayForward />
            </button>
          </div>

          <div className="mt-2 flex w-full items-center gap-3">
            <span className="w-10 text-right text-[11px] text-gray-400">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => {
                e.stopPropagation();
                handleSeek(e);
              }}
              className="h-1.5 w-full cursor-pointer accent-amber-500"
            />
            <span className="w-10 text-left text-[11px] text-gray-400">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 md:flex">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => {
                e.stopPropagation();
                setVolume(Number(e.target.value));
              }}
              className="h-1.5 w-20 cursor-pointer accent-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayerSize(e);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Player;
