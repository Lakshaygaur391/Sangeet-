import { createContext, useContext, useState } from "react";

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [songList, setSongList] = useState([]); // already exists
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(""); // new
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <PlayerContext.Provider
      value={{
        currentVideoId,
        setCurrentVideoId,
        currentSong,
        setCurrentSong,
        songList,
        setSongList,
        currentIndex,
        setCurrentIndex,
        searchQuery,
        setSearchQuery,
        showLoginModal,
        setShowLoginModal,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
