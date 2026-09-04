import { useAuthStore } from "@/store/auth.store"
import AccessibilityWidget from "@/components/ui/AccessibilityWidget"
import EmergencyPrintButton from "@/components/ui/EmergencyPrintButton"
import WindowControls from "@/components/ui/WindowControls"

// Barra de título propia — la ventana se crea con frame:false (electron/main.js),
// así que no hay marco nativo del sistema operativo: esta barra reemplaza tanto el
// título como los botones de minimizar/maximizar/cerrar. Toda la franja es zona de
// arrastre ("-webkit-app-region: drag") salvo los botones, que son "no-drag" para
// seguir siendo clicables.
//
// Solo se usa en las pantallas SIN sesión (Login/Setup) — una vez logueado,
// MainLayout.jsx dibuja su propia barra unificada (ícono + sección + usuario) y deja
// de montar esta, para no tener dos barras apiladas.
export const TITLE_BAR_HEIGHT = 32

export default function TitleBar() {
  const token = useAuthStore(s => s.token)

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

        <WindowControls />
      </div>
    </div>
  )
}
