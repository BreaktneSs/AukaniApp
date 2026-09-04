import { useState, useEffect, useRef } from "react"
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth.store"
import { shiftsService } from "@/services/shifts.service"
import { dispatchService } from "@/services/dispatch.service"
import {
  ShoppingCart, BarChart3, ClipboardList, Settings,
  LogOut, Boxes, Menu,
  Landmark, Smartphone, Bell, ShieldCheck, CalendarDays, ShoppingBag
} from "lucide-react"
import TitleBar from "@/components/ui/TitleBar"
import WindowControls from "@/components/ui/WindowControls"
import AccessibilityWidget from "@/components/ui/AccessibilityWidget"
import EmergencyPrintButton from "@/components/ui/EmergencyPrintButton"
import RailIcon from "@/components/ui/RailIcon"

const nav = [
  { to: "/pos",          icon: ShoppingCart,  label: "Caja",               roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/waiter",       icon: Smartphone,    label: "Caja remota",        roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/dispatch",     icon: Bell,          label: "Despachos",          roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/reservations", icon: CalendarDays,  label: "Reservas",           roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/inventory",    icon: Boxes,         label: "Inventario",         roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/purchases",    icon: ShoppingBag,   label: "Compras",            roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/sales",        icon: ClipboardList, label: "Ventas/Devoluciones",roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/shifts",       icon: Landmark,      label: "Control caja",       roles: ["ADMIN","JEFE"] },
  { to: "/dashboard",    icon: BarChart3,     label: "Dashboard",          roles: ["ADMIN","JEFE"] },
  { to: "/settings",     icon: Settings,      label: "Config.",            roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/audit",        icon: ShieldCheck,   label: "Auditoría",          roles: ["ADMIN"] },
]

// Por debajo de este ancho se usa el layout angosto (doble barra + sidebar-overlay
// con hamburguesa) — la barra unificada + riel necesitan algo más de espacio para
// no verse apretados. La ventana de Electron nunca baja de 1024px (minWidth en
// electron/main.js), así que esto es sobre todo un resguardo a futuro.
const NARROW_BREAKPOINT = 900

function useIsNarrow(breakpoint = NARROW_BREAKPOINT) {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = () => setIsNarrow(mq.matches)
    handler()
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [breakpoint])
  return isNarrow
}

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const isNarrow = useIsNarrow()

  const handleLogout = () => { logout(); navigate("/login") }
  const visibleNav = nav.filter(n => n.roles.includes(user?.role))
  const close = () => setOpen(false)

  // Long-press en modo táctil: cualquier ícono del riel lo activa, y muestra el
  // nombre de TODOS a la vez (para ubicarse de un vistazo). Se apaga soltando el
  // dedo, en cualquier parte de la pantalla — no solo sobre el ícono presionado.
  const [showAllLabels, setShowAllLabels] = useState(false)
  useEffect(() => {
    if (!showAllLabels) return
    const clear = () => setShowAllLabels(false)
    document.addEventListener("touchend", clear)
    return () => document.removeEventListener("touchend", clear)
  }, [showAllLabels])

  // Turno activo + despachos pendientes — independiente de qué página esté montada,
  // para que el badge del riel funcione sin importar en qué sección estés parado.
  // Mismas query keys que ya usan POSPage/ShiftsPage: comparten caché, no duplican
  // llamadas al servidor.
  const { data: shift } = useQuery({
    queryKey: ["shift-active"],
    queryFn: shiftsService.getActive,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })
  const { data: pendingDispatches = [] } = useQuery({
    queryKey: ["dispatches-pending", shift?.id],
    queryFn: () => dispatchService.getPendingDispatches(shift.id),
    enabled: !!shift?.id,
    refetchInterval: 5_000,
  })
  const dispatchCount = pendingDispatches.length

  // Pulso breve en el badge cuando SUBE el conteo (llegó un despacho nuevo) — mismo
  // espíritu que el "flashingTabId" que ya existe en cart.store para las cuentas.
  const prevDispatchCount = useRef(dispatchCount)
  const [dispatchPulse, setDispatchPulse] = useState(false)
  useEffect(() => {
    if (dispatchCount > prevDispatchCount.current) {
      setDispatchPulse(true)
      const t = setTimeout(() => setDispatchPulse(false), 600)
      prevDispatchCount.current = dispatchCount
      return () => clearTimeout(t)
    }
    prevDispatchCount.current = dispatchCount
  }, [dispatchCount])

  const currentSection = nav.find(n => n.to === location.pathname)?.label

  // ── Modo angosto: doble barra + sidebar-overlay, sin tocar la lógica actual ──
  if (isNarrow) return (
    <>
      <TitleBar />
      <div className="flex overflow-hidden" style={{ height: "calc(100vh - 32px)", background: "var(--bg-primary)" }}>

        {/* Backdrop con blur — solo visible cuando la sidebar está abierta */}
        {open && (
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
            onClick={close}
          />
        )}

        {/* Sidebar overlay */}
        <aside
          className="fixed left-0 top-0 h-full z-50 flex flex-col border-r transition-transform duration-200"
          style={{
            width: "224px",
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            transform: open ? "translateX(0)" : "translateX(-100%)",
          }}>

          <div className="flex items-center border-b px-3 py-3 gap-2"
            style={{ borderColor: "var(--border)", minHeight: "52px" }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-white text-sm"
                style={{ background: "var(--brand)" }}>A</div>
              <span className="font-display font-bold text-base tracking-tight truncate"
                style={{ color: "var(--text-primary)" }}>Aukani</span>
            </div>
          </div>

          <nav className="flex-1 flex flex-col gap-0.5 p-1.5 overflow-y-auto">
            {visibleNav.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2.5 py-2.5 rounded-md transition-all duration-150 ${isActive ? "font-semibold" : "hover:opacity-80"}`}
                style={({ isActive }) => ({
                  background: isActive ? "var(--brand-light)" : "transparent",
                  color: isActive ? "var(--brand)" : "var(--text-secondary)",
                })}>
                <Icon size={17} className="shrink-0" />
                <span className="text-sm truncate">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-1.5 border-t space-y-0.5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-md"
              style={{ background: "var(--bg-tertiary)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: "var(--brand)" }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md hover:opacity-80"
              style={{ color: "var(--danger)" }}>
              <LogOut size={16} />
              <span className="text-sm">Salir</span>
            </button>
          </div>
        </aside>

        {/* Contenido principal — ocupa toda la pantalla */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar con botón hamburguesa */}
          <header className="flex items-center gap-3 px-4 shrink-0 border-b"
            style={{ height: "52px", borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <button onClick={() => setOpen(o => !o)}
              className="w-8 h-8 rounded-md flex items-center justify-center btn-ghost"
              style={{ color: "var(--text-muted)" }}>
              <Menu size={18} />
            </button>
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-white text-xs shrink-0"
              style={{ background: "var(--brand)" }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="font-display font-bold text-sm truncate flex-1" style={{ color: "var(--text-primary)" }}>{user?.name}</span>
          </header>

          <main className="flex-1 overflow-auto"><Outlet /></main>
        </div>
      </div>
    </>
  )

  // ── Modo ancho: barra unificada + riel vertical de íconos ──
  // Barra + riel comparten el mismo fondo y no llevan borde entre ellos — se leen
  // como un solo marco en L (como el riel de servidores + header de Discord), y lo
  // que se navega es un panel aparte con esquina redondeada, "encajado" en ese marco.
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100vh", background: "var(--bg-secondary)" }}>

      <div
        className="flex items-center justify-between shrink-0 select-none"
        style={{ height: 40, background: "var(--bg-secondary)", WebkitAppRegion: "drag" }}
        onDoubleClick={() => window.electronAPI.windowMaximize()}>

        <div className="flex items-center gap-2.5 px-3 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-white text-xs shrink-0"
            style={{ background: "var(--brand)" }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="font-display font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {currentSection ? `${currentSection} · ` : ""}POS - {user?.name}
          </span>
        </div>

        <div className="flex items-center h-full" style={{ WebkitAppRegion: "no-drag" }}>
          <div className="flex items-center gap-1 px-1.5">
            <AccessibilityWidget />
            <EmergencyPrintButton />
          </div>
          <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
          <WindowControls />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="flex flex-col items-center gap-1 py-2 shrink-0 overflow-y-auto"
          style={{ width: 52, background: "var(--bg-secondary)" }}>
          {visibleNav.map(({ to, icon, label }) => (
            <RailIcon key={to} to={to} icon={icon} label={label}
              badge={to === "/dispatch" ? dispatchCount : undefined}
              pulse={to === "/dispatch" && dispatchPulse}
              showAllLabels={showAllLabels} onLongPress={() => setShowAllLabels(true)} />
          ))}
          <div className="mt-auto pt-1">
            <RailIcon onClick={handleLogout} icon={LogOut} label="Cerrar sesión" danger
              showAllLabels={showAllLabels} onLongPress={() => setShowAllLabels(true)} />
          </div>
        </nav>

        {/* Un "border" real de CSS (no box-shadow) — el borde siempre se pinta en el
            borde de la caja sin importar el overflow del elemento ni lo que traiga
            cada página adentro; box-shadow, en cambio, se puede terminar recortando
            solo por tener overflow-auto en el mismo elemento. */}
        <main className="flex-1 overflow-auto"
          style={{
            background: "var(--bg-primary)",
            borderTopLeftRadius: 20,
            border: "2px solid var(--border)",
            boxSizing: "border-box",
            boxShadow: "0 16px 40px -8px rgba(0,0,0,0.5)",
          }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
