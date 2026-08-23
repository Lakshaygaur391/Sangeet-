import { useEffect } from "react";
import { usePlayer } from "./context/PlayerContext";
import { useLibrary } from "./context/LibraryContext";

const PlaybackBridge = () => {
  const { registerOnPlay } = usePlayer();
  const { recordRecentlyPlayed } = useLibrary();

  useEffect(() => {
    registerOnPlay((song) => recordRecentlyPlayed(song));
  }, [registerOnPlay, recordRecentlyPlayed]);

  return null;
};

export default PlaybackBridge;
