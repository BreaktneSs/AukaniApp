import { create } from "zustand"

const saved = JSON.parse(localStorage.getItem("aukani_ui") || "{}")

export const useUiStore = create((set) => ({
  touchMode: saved.touchMode ?? false,

  setTouchMode: (val) => set((state) => {
    const next = typeof val === "boolean" ? val : !state.touchMode
    localStorage.setItem("aukani_ui", JSON.stringify({ ...saved, touchMode: next }))
    return { touchMode: next }
  }),
}))
