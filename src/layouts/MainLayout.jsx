import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import {
  ShoppingCart, BarChart3, ClipboardList, Settings,
  LogOut, Boxes, Menu,
  Landmark, Smartphone, Bell, ShieldCheck, CalendarDays
} from "lucide-react"
import AccessibilityWidget from "@/components/ui/AccessibilityWidget"

const nav = [
  { to: "/pos",          icon: ShoppingCart,  label: "Caja",               roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/waiter",       icon: Smartphone,    label: "Caja remota",        roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/dispatch",     icon: Bell,          label: "Despachos",          roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/reservations", icon: CalendarDays,  label: "Reservas",           roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/inventory",    icon: Boxes,         label: "Inventario",         roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/sales",        icon: ClipboardList, label: "Ventas/Devoluciones",roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/shifts",       icon: Landmark,      label: "Control caja",       roles: ["ADMIN","JEFE"] },
  { to: "/dashboard",    icon: BarChart3,     label: "Dashboard",          roles: ["ADMIN","JEFE"] },
  { to: "/settings",     icon: Settings,      label: "Config.",            roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/audit",        icon: ShieldCheck,   label: "Auditoría",          roles: ["ADMIN"] },
]

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate("/login") }
  const visibleNav = nav.filter(n => n.roles.includes(user?.role))
  const close = () => setOpen(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>

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
          <AccessibilityWidget />
        </header>

        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  )
}
