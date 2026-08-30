import { create } from "zustand"

// Lectura defensiva: si localStorage tiene datos corruptos (ej. "undefined" literal,
// de un login anterior con respuesta incompleta), no debe tumbar el arranque de toda la app.
function readStoredUser() {
  const stored = localStorage.getItem("aukani_user")
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    localStorage.removeItem("aukani_user")
    return null
  }
}

export const useAuthStore = create((set) => ({
  user: readStoredUser(),
  token: localStorage.getItem("aukani_token") || null,

  login: (user, token) => {
    if (!user || !token) {
      console.error("auth.store.login llamado sin user/token válidos — se ignora para no corromper la sesión", { user, token })
      return
    }
    localStorage.setItem("aukani_token", token)
    localStorage.setItem("aukani_user", JSON.stringify(user))
    set({ user, token })
  },

  setUser: (user) => {
    if (!user) return
    localStorage.setItem("aukani_user", JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    localStorage.removeItem("aukani_token")
    localStorage.removeItem("aukani_user")
    set({ user: null, token: null })
  },
}))