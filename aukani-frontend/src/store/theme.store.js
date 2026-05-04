import { create } from "zustand"
import { applyProductLabelColor } from "./a11y.store.js"

const saved = localStorage.getItem("aukani_theme") || "dark"
if (saved === "dark") document.documentElement.classList.add("dark")

export const useThemeStore = create((set) => ({
  theme: saved,
  toggle: () => set((state) => {
    const next = state.theme === "dark" ? "light" : "dark"
    localStorage.setItem("aukani_theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
    const a11y = JSON.parse(localStorage.getItem("aukani_a11y") || "{}")
    applyProductLabelColor(a11y.productLabelColor || "p1", next === "dark", a11y.productLabelCustomColor)
    return { theme: next }
  }),
}))
