import api from "./api.js"
export const authService = {
  login: (data) => api.post("/auth/login", data).then(r => r.data),
  loginVerify2FA: (tempToken, code) => api.post("/auth/login/2fa", { tempToken, code }).then(r => r.data),
  me: () => api.get("/auth/me").then(r => r.data),
  canResetWithTotp: (email) => api.post("/auth/forgot-password/check", { email }).then(r => r.data),
  resetPasswordWithTotp: (email, code, newPassword) => api.post("/auth/forgot-password/reset", { email, code, newPassword }).then(r => r.data),
}