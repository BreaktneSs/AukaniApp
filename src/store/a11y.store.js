import { create } from "zustand"

const FONT_SIZES = { sm: "14px", md: "16px", lg: "18px", xl: "20px" }

export const PRODUCT_LABEL_PRESETS = [
  { key: "white",  label: "Blanco",   color: "#ffffff" },
  { key: "cream",  label: "Crema",    color: "#f5e6d0" },
  { key: "green",  label: "Verde",    color: "#85cb33" },
  { key: "yellow", label: "Amarillo", color: "#fde047" },
  { key: "orange", label: "Naranja",  color: "#fb923c" },
  { key: "teal",   label: "Teal",     color: "#67e8f9" },
]

function persist(patch) {
  const curr = JSON.parse(localStorage.getItem("aukani_a11y") || "{}")
  localStorage.setItem("aukani_a11y", JSON.stringify({ ...curr, ...patch }))
}

function applyFontSize(size) {
  document.documentElement.style.fontSize = FONT_SIZES[size] ?? FONT_SIZES.md
}

function applyContrast(contrast) {
  document.documentElement.classList.toggle("high-contrast", contrast === "high")
}

export function applyProductLabelColor(key, customColor) {
  if (key === "custom") {
    if (customColor) document.documentElement.style.setProperty("--product-label-color", customColor)
  } else {
    const preset = PRODUCT_LABEL_PRESETS.find(p => p.key === key)
    if (preset) document.documentElement.style.setProperty("--product-label-color", preset.color)
  }
}

const saved = JSON.parse(localStorage.getItem("aukani_a11y") || "{}")
applyFontSize(saved.fontSize || "md")
applyContrast(saved.contrast || "normal")
applyProductLabelColor(saved.productLabelColor || "white", saved.productLabelCustomColor)

export const useA11yStore = create((set) => ({
  fontSize:               saved.fontSize               || "md",
  contrast:               saved.contrast               || "normal",
  productLabelColor:      saved.productLabelColor      || "white",
  productLabelCustomColor: saved.productLabelCustomColor || "#ff6b6b",

  setFontSize: (size) => {
    applyFontSize(size)
    persist({ fontSize: size })
    set({ fontSize: size })
  },

  setContrast: (contrast) => {
    applyContrast(contrast)
    persist({ contrast })
    set({ contrast })
  },

  setProductLabelColor: (key) => set((state) => {
    applyProductLabelColor(key, state.productLabelCustomColor)
    persist({ productLabelColor: key })
    return { productLabelColor: key }
  }),

  setProductLabelCustomColor: (hex) => {
    applyProductLabelColor("custom", hex)
    persist({ productLabelColor: "custom", productLabelCustomColor: hex })
    set({ productLabelColor: "custom", productLabelCustomColor: hex })
  },
}))
