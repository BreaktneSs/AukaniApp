import { create } from "zustand"

const saved = localStorage.getItem("aukani_theme") || "dark"
if (saved === "dark") document.documentElement.classList.add("dark")

export const useThemeStore = create((set) => ({
  theme: saved,
  toggle: () => set((state) => {
    const next = state.theme === "dark" ? "light" : "dark"
    localStorage.setItem("aukani_theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
    return { theme: next }
  }),
}))