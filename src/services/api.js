import axios from "axios"
import { getDeviceId } from "@/utils/device.js"

const api = axios.create({
  baseURL: "/api",
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
    if (err.response?.status === 401) {
      localStorage.removeItem("aukani_token")
      localStorage.removeItem("aukani_user")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api