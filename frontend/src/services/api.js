import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach the auth token (if present) on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sangeet_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Listeners the app can subscribe to for global 401 handling (see AuthContext).
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

// Small helper so services can fail soft (e.g. a playlist endpoint that
// doesn't exist yet on the backend) without crashing a whole page.
export async function safeRequest(promise, fallback = null) {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[api] request failed:", err?.config?.url, err?.message);
    }
    return fallback;
  }
}

export default api;
