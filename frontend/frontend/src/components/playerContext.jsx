import { createContext, useContext, useState } from "react";

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [songList, setSongList] = useState([]); // already exists
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(""); // new

  return (
    <PlayerContext.Provider
      value={{
        currentVideoId,
        setCurrentVideoId,
        songList,
        setSongList,
        currentIndex,
        setCurrentIndex,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
