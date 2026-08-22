import axios from "axios"
import { getDeviceId } from "@/utils/device.js"

const isElectron = window.electronAPI?.isElectron ?? false
const backendUrl = isElectron
  ? (window.electronAPI.serverUrl || "http://localhost:3000")
  : null

const api = axios.create({
  baseURL: isElectron ? backendUrl : "/api",
  timeout: 10000,
})

// Inyectar token y deviceId en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aukani_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers["X-Device-Id"] = getDeviceId()
  return config
})

// Manejar 401 globalmente
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isOnLogin = isElectron
      ? window.location.hash === "#/login"
      : window.location.pathname === "/login"
    if (err.response?.status === 401 && !isOnLogin) {
      localStorage.removeItem("aukani_token")
      localStorage.removeItem("aukani_user")
      window.location.href = isElectron ? "#/login" : "/login"
    }
    return Promise.reject(err)
  }
)

export default api
