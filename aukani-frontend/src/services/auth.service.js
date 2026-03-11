import api from "./api.js"
export const authService = {
  login: (data) => api.post("/auth/login", data).then(r => r.data),
  me: () => api.get("/auth/me").then(r => r.data),
}