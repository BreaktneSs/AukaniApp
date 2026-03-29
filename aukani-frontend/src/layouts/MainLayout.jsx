import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useThemeStore } from "@/store/theme.store"
import {
  ShoppingCart, Package, BarChart3, ClipboardList, Settings,
  LogOut, Sun, Moon, Boxes, PanelLeftClose, PanelLeftOpen,
  Landmark, Smartphone, Bell
} from "lucide-react"

const nav = [
  { to: "/pos",       icon: ShoppingCart,    label: "Caja",          roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/waiter",    icon: Smartphone,      label: "Caja remota",   roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/dispatch",  icon: Bell,            label: "Despachos",     roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/products",  icon: Package,         label: "Productos",     roles: ["ADMIN","JEFE"] },
  { to: "/inventory", icon: Boxes,           label: "Inventario",    roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/sales",     icon: ClipboardList,   label: "Ventas",        roles: ["ADMIN","JEFE"] },
  { to: "/shifts",    icon: Landmark,        label: "Control caja",  roles: ["ADMIN","JEFE"] },
  { to: "/dashboard", icon: BarChart3,       label: "Dashboard",     roles: ["ADMIN","JEFE"] },
  { to: "/settings",  icon: Settings,        label: "Config.",       roles: ["ADMIN"] },
]

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => { logout(); navigate("/login") }
  const visibleNav = nav.filter(n => n.roles.includes(user?.role))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <aside className="flex flex-col shrink-0 border-r transition-all duration-200"
        style={{ width: collapsed ? "52px" : "224px", background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

        <div className="flex items-center border-b px-2 py-3 gap-2"
          style={{ borderColor: "var(--border)", minHeight: "52px" }}>
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-white text-sm"
                style={{ background: "var(--brand)" }}>A</div>
              <span className="font-display font-bold text-base tracking-tight truncate"
                style={{ color: "var(--text-primary)" }}>Aukani</span>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 btn-ghost ml-auto"
            title={collapsed ? "Expandir" : "Colapsar"} style={{ color: "var(--text-muted)" }}>
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 p-1.5 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2.5 py-2.5 rounded-md transition-all duration-150 ${isActive ? "font-semibold" : "hover:opacity-80"}`}
              style={({ isActive }) => ({
                background: isActive ? "var(--brand-light)" : "transparent",
                color: isActive ? "var(--brand)" : "var(--text-secondary)",
                justifyContent: collapsed ? "center" : "flex-start",
              })}>
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="text-sm truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-1.5 border-t space-y-0.5" style={{ borderColor: "var(--border)" }}>
          {!collapsed && (
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
          )}
          <button onClick={toggle} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md hover:opacity-80"
            style={{ color: "var(--text-secondary)", justifyContent: collapsed ? "center" : "flex-start" }}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span className="text-sm">{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
          </button>
          <button onClick={handleLogout} title="Cerrar sesión"
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md hover:opacity-80"
            style={{ color: "var(--danger)", justifyContent: collapsed ? "center" : "flex-start" }}>
            <LogOut size={16} />
            {!collapsed && <span className="text-sm">Salir</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  )
}