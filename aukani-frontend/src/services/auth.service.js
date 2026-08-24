import api from "./api.js"
export const authService = {
  login: (data) => api.post("/auth/login", data).then(r => r.data),
  loginVerify2FA: (tempToken, code) => api.post("/auth/login/2fa", { tempToken, code }).then(r => r.data),
  me: () => api.get("/auth/me").then(r => r.data),
}