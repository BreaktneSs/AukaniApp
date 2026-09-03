import { useState, useEffect } from "react"
import { Minus, Square, Copy, X } from "lucide-react"
import { useAuthStore } from "@/store/auth.store"
import AccessibilityWidget from "@/components/ui/AccessibilityWidget"
import EmergencyPrintButton from "@/components/ui/EmergencyPrintButton"

// Barra de título propia — la ventana se crea con frame:false (electron/main.js),
// así que no hay marco nativo del sistema operativo: esta barra reemplaza tanto el
// título como los botones de minimizar/maximizar/cerrar. Toda la franja es zona de
// arrastre ("-webkit-app-region: drag") salvo los botones, que son "no-drag" para
// seguir siendo clicables.
export const TITLE_BAR_HEIGHT = 32

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    window.electronAPI.windowIsMaximized().then(setIsMaximized)
    window.electronAPI.onWindowMaximizedChange(setIsMaximized)
  }, [])

  return (
    <div
      className="flex items-center justify-between shrink-0 select-none"
      style={{ height: TITLE_BAR_HEIGHT, background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", WebkitAppRegion: "drag" }}
      onDoubleClick={() => window.electronAPI.windowMaximize()}>

      <div className="flex items-center gap-2 px-3 min-w-0">
        <div className="w-4 h-4 rounded flex items-center justify-center font-display font-bold text-white shrink-0"
          style={{ background: "var(--brand)", fontSize: "9px" }}>A</div>
        <span className="text-xs font-medium truncate" style={{ color: "var(--text-muted)" }}>Aukani POS</span>
      </div>

      <div className="flex items-center h-full" style={{ WebkitAppRegion: "no-drag" }}>
        {/* Personalizar (tema/accesibilidad) + emergencia — antes vivían en cada página, ahora quedan siempre a mano */}
        <div className="flex items-center gap-1 px-1.5">
          <AccessibilityWidget />
          {token && <EmergencyPrintButton />}
        </div>

        <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />

        <div className="flex items-stretch h-full">
        <button onClick={() => window.electronAPI.windowMinimize()} title="Minimizar"
          className="w-11 flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-secondary)" }}>
          <Minus size={14} />
        </button>
        <button onClick={() => window.electronAPI.windowMaximize()} title={isMaximized ? "Restaurar" : "Maximizar"}
          className="w-11 flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-secondary)" }}>
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
      </div>
    </div>
  )
}
