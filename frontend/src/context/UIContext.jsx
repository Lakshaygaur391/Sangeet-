import { createContext, useCallback, useContext, useMemo, useState } from "react";

const UIContext = createContext();

let idCounter = 0;

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  // Reusable auth-gate modal state. `action` drives the copy shown
  // (see AuthPromptModal) — "like", "playlist", "follow", "save", or
  // the default sign-up prompt when triggered from the topbar.
  const [authPrompt, setAuthPrompt] = useState({ open: false, action: "default" });

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sangeet_sidebar_open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sangeet_sidebar_open", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, variant = "info", duration = 3200) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismissToast(id), duration);
      return id;
    },
    [dismissToast]
  );

  const openAuthPrompt = useCallback((action = "default") => {
    setAuthPrompt({ open: true, action });
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setAuthPrompt((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      toast,
      dismissToast,
      authPrompt,
      openAuthPrompt,
      closeAuthPrompt,
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar,
    }),
    [toasts, toast, dismissToast, authPrompt, openAuthPrompt, closeAuthPrompt, sidebarOpen, toggleSidebar]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => useContext(UIContext);
