import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";
import { onUnauthorized } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("sangeet_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("sangeet_token") || null);
  const [loading, setLoading] = useState(false);

  const persistSession = useCallback((userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("sangeet_user", JSON.stringify(userData));
    localStorage.setItem("sangeet_token", userToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("sangeet_user");
    localStorage.removeItem("sangeet_token");
  }, []);

  // Central 401 handling: any API call anywhere in the app that comes back
  // unauthorized will log the session out and send them back to /login.
  useEffect(() => {
    onUnauthorized(() => logout());
  }, [logout]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      const { user: userData, token: userToken } = res.data;
      persistSession(userData, userToken);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed. Please check your credentials.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await authService.register(name, email, password);
      const { user: userData, token: userToken } = res.data;
      persistSession(userData, userToken);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed. Please try again.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(user && token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
