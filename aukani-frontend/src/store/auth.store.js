import { create } from "zustand"

const stored = localStorage.getItem("aukani_user")

export const useAuthStore = create((set) => ({
  user: stored ? JSON.parse(stored) : null,
  token: localStorage.getItem("aukani_token") || null,

  login: (user, token) => {
    localStorage.setItem("aukani_token", token)
    localStorage.setItem("aukani_user", JSON.stringify(user))
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem("aukani_token")
    localStorage.removeItem("aukani_user")
    set({ user: null, token: null })
  },
}))