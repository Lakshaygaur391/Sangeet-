import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("sangeet_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("sangeet_token") || null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/login`, {
        email,
        password,
      });

      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem("sangeet_user", JSON.stringify(userData));
      localStorage.setItem("sangeet_token", userToken);
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
      const res = await axios.post(`${API}/api/auth/register`, {
        name,
        email,
        password,
      });

      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem("sangeet_user", JSON.stringify(userData));
      localStorage.setItem("sangeet_token", userToken);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed. Please try again.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("sangeet_user");
    localStorage.removeItem("sangeet_token");
    delete axios.defaults.headers.common["Authorization"];
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
