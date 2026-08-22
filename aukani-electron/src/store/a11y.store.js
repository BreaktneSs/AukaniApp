import { create } from "zustand"

const FONT_SIZES = { sm: "14px", md: "16px", lg: "18px", xl: "20px" }

// Cada preset tiene variante para dark y light — colores de la paleta del app
export const PRODUCT_LABEL_PRESETS = [
  { key: "p1", dark: "#ffffff", light: "#000000", darkLabel: "Blanco",  lightLabel: "Negro"   },
  { key: "p2", dark: "#bdb4bf", light: "#000500", darkLabel: "Slate",   lightLabel: "Oscuro"  },
  { key: "p3", dark: "#85cb33", light: "#036016", darkLabel: "Verde",   lightLabel: "Verde"   },
  { key: "p4", dark: "#50a2a7", light: "#1a7a7f", darkLabel: "Teal",    lightLabel: "Teal"    },
  { key: "p5", dark: "#f59e0b", light: "#fb8b24", darkLabel: "Ámbar",   lightLabel: "Naranja" },
  { key: "p6", dark: "#f5e6d0", light: "#6b4226", darkLabel: "Crema",   lightLabel: "Marrón"  },
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

export function applyProductLabelColor(key, isDark, customColor) {
  if (key === "custom") {
    if (customColor) document.documentElement.style.setProperty("--product-label-color", customColor)
    return
  }
  const preset = PRODUCT_LABEL_PRESETS.find(p => p.key === key)
  if (preset) {
    document.documentElement.style.setProperty("--product-label-color", isDark ? preset.dark : preset.light)
  }
}

const saved   = JSON.parse(localStorage.getItem("aukani_a11y") || "{}")
const initDark = document.documentElement.classList.contains("dark")
applyFontSize(saved.fontSize || "md")
applyContrast(saved.contrast || "normal")
applyProductLabelColor(saved.productLabelColor || "p1", initDark, saved.productLabelCustomColor)

export const useA11yStore = create((set) => ({
  fontSize:                saved.fontSize               || "md",
  contrast:                saved.contrast               || "normal",
  productLabelColor:       saved.productLabelColor      || "p1",
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
    const isDark = document.documentElement.classList.contains("dark")
    applyProductLabelColor(key, isDark, state.productLabelCustomColor)
    persist({ productLabelColor: key })
    return { productLabelColor: key }
  }),

  setProductLabelCustomColor: (hex) => {
    applyProductLabelColor("custom", false, hex)
    persist({ productLabelColor: "custom", productLabelCustomColor: hex })
    set({ productLabelColor: "custom", productLabelCustomColor: hex })
  },
}))
