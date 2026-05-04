import { useState, useRef, useEffect } from "react"
import { Accessibility, Sun, Moon, X, Check, Plus } from "lucide-react"
import { useThemeStore } from "@/store/theme.store"
import { useA11yStore, PRODUCT_LABEL_PRESETS } from "@/store/a11y.store"

const FONT_OPTIONS = [
  { key: "sm", label: "A",  title: "Pequeño",    px: 11 },
  { key: "md", label: "A",  title: "Normal",     px: 13 },
  { key: "lg", label: "A",  title: "Grande",     px: 16 },
  { key: "xl", label: "A",  title: "Muy grande", px: 19 },
]

// Returns true if the hex color is light (needs dark text/icon on top)
function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const ref       = useRef(null)
  const colorInput = useRef(null)

  const { theme, toggle } = useThemeStore()
  const {
    fontSize, contrast,
    productLabelColor, productLabelCustomColor,
    setFontSize, setContrast, setProductLabelColor, setProductLabelCustomColor,
  } = useA11yStore()

  const isDark = theme === "dark"
  const isCustomActive = productLabelColor === "custom"

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const activeLabel = isCustomActive
    ? "Personalizado"
    : PRODUCT_LABEL_PRESETS.find(p => p.key === productLabelColor)?.label ?? ""

  return (
    <div ref={ref} style={{ position: "relative" }}>

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Accesibilidad"
        className="w-8 h-8 rounded-md flex items-center justify-center btn-ghost shrink-0"
        style={{ color: open ? "var(--brand)" : "var(--text-muted)" }}>
        <Accessibility size={16} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          zIndex: 9999,
          width: "228px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Accesibilidad
            </p>
            <button onClick={() => setOpen(false)}
              className="w-5 h-5 rounded flex items-center justify-center btn-ghost"
              style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-4">

            {/* Tema */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Tema</p>
              <button onClick={toggle}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
                {isDark
                  ? <Moon size={15} style={{ color: "var(--brand)" }} />
                  : <Sun  size={15} style={{ color: "var(--warning)" }} />}
                {isDark ? "Modo oscuro" : "Modo claro"}
                <div className="ml-auto relative w-9 h-5 rounded-full shrink-0 transition-colors duration-200"
                  style={{ background: isDark ? "var(--brand)" : "var(--bg-primary)", border: "1.5px solid var(--border)" }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: isDark ? "translateX(1rem)" : "translateX(0.1rem)" }} />
                </div>
              </button>
            </div>

            {/* Color etiquetas de productos */}
            <div className="space-y-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Texto en productos</p>

              {/* Mini preview */}
              <div className="relative rounded-lg overflow-hidden" style={{ height: "38px", background: "var(--bg-tertiary)" }}>
                <div className="absolute inset-x-0 bottom-0 px-2 py-1"
                  style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(4px)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: "var(--product-label-color)" }}>Producto ejemplo</span>
                    <span className="text-xs font-mono font-bold" style={{ color: "var(--product-label-color)" }}>$12.000</span>
                  </div>
                </div>
              </div>

              {/* Swatches */}
              <div className="flex gap-2 flex-wrap items-center">
                {PRODUCT_LABEL_PRESETS.map(preset => {
                  const active = productLabelColor === preset.key
                  const light  = isLight(preset.color)
                  return (
                    <button
                      key={preset.key}
                      title={preset.label}
                      onClick={() => setProductLabelColor(preset.key)}
                      style={{
                        width: 28, height: 28,
                        borderRadius: "50%",
                        background: preset.color,
                        border: active ? "2.5px solid var(--brand)" : "2px solid var(--border)",
                        boxShadow: active ? "0 0 0 2px var(--brand-light)" : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        transition: "box-shadow 0.15s",
                      }}>
                      {active && <Check size={13} strokeWidth={3} style={{ color: light ? "#222" : "#fff" }} />}
                    </button>
                  )
                })}

                {/* Custom color circle */}
                <div style={{ position: "relative" }}>
                  <button
                    title="Color personalizado"
                    onClick={() => colorInput.current?.click()}
                    style={{
                      width: 28, height: 28,
                      borderRadius: "50%",
                      background: isCustomActive ? productLabelCustomColor : "var(--bg-tertiary)",
                      border: isCustomActive ? "2.5px solid var(--brand)" : "2px dashed var(--text-muted)",
                      boxShadow: isCustomActive ? "0 0 0 2px var(--brand-light)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      transition: "box-shadow 0.15s",
                    }}>
                    {isCustomActive
                      ? <Check size={13} strokeWidth={3}
                          style={{ color: isLight(productLabelCustomColor) ? "#222" : "#fff" }} />
                      : <Plus size={12} strokeWidth={2.5} style={{ color: "var(--text-muted)" }} />
                    }
                  </button>
                  {/* Hidden native color picker */}
                  <input
                    ref={colorInput}
                    type="color"
                    value={productLabelCustomColor}
                    onChange={e => setProductLabelCustomColor(e.target.value)}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: "none" }}
                  />
                </div>
              </div>

              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{activeLabel}</p>
            </div>

            {/* Tamaño de letra */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Tamaño de letra</p>
              <div className="grid grid-cols-4 gap-1">
                {FONT_OPTIONS.map(opt => {
                  const active = fontSize === opt.key
                  return (
                    <button key={opt.key} title={opt.title} onClick={() => setFontSize(opt.key)}
                      className="flex items-center justify-center py-2 rounded-lg transition-all font-bold"
                      style={{
                        fontSize: `${opt.px}px`, lineHeight: 1,
                        background: active ? "var(--brand)" : "var(--bg-tertiary)",
                        color: active ? "white" : "var(--text-secondary)",
                      }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contraste */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Contraste</p>
              <div className="grid grid-cols-2 gap-1">
                {[{ key: "normal", label: "Normal" }, { key: "high", label: "Alto" }].map(opt => {
                  const active = contrast === opt.key
                  return (
                    <button key={opt.key} onClick={() => setContrast(opt.key)}
                      className="py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: active ? "var(--brand)" : "var(--bg-tertiary)",
                        color: active ? "white" : "var(--text-secondary)",
                      }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
