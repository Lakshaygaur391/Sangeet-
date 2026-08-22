import api from "./api";

const authService = {
  login: (email, password) => api.post("/api/auth/login", { email, password }),
  register: (name, email, password) => api.post("/api/auth/register", { name, email, password }),
  me: () => api.get("/api/auth/me"),
};

export default authService;
