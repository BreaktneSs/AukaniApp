import { useState, useEffect } from "react"
import { Minus, Square, Copy, X } from "lucide-react"

// Botones de minimizar/maximizar/cerrar — extraído de TitleBar.jsx para poder
// reutilizarlo también en la barra unificada de MainLayout (ambos corren dentro de
// la misma ventana sin marco nativo, frame:false en electron/main.js).
export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.windowIsMaximized().then(setIsMaximized)
    window.electronAPI.onWindowMaximizedChange(setIsMaximized)
  }, [])

  return (
    <div className="flex items-stretch h-full" style={{ WebkitAppRegion: "no-drag" }}>
      <button onClick={() => window.electronAPI.windowMinimize()} title="Minimizar"
        className="w-11 flex items-center justify-center transition-colors"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#eab308"; e.currentTarget.style.color = "#1a1a1a" }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)" }}>
        <Minus size={14} />
      </button>
      <button onClick={() => window.electronAPI.windowMaximize()} title={isMaximized ? "Restaurar" : "Maximizar"}
        className="w-11 flex items-center justify-center transition-colors"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#3b82f6"; e.currentTarget.style.color = "white" }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)" }}>
        {isMaximized ? <Copy size={12} /> : <Square size={11} />}
      </button>
      <button onClick={() => window.electronAPI.windowClose()} title="Cerrar"
        className="w-11 flex items-center justify-center transition-colors"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--danger)"; e.currentTarget.style.color = "white" }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)" }}>
        <X size={14} />
      </button>
    </div>
  )
}
