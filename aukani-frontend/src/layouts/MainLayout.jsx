import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useThemeStore } from "@/store/theme.store"
import {
  ShoppingCart, Package, BarChart3, ClipboardList,
  Settings, LogOut, Sun, Moon, Boxes, ChevronRight
} from "lucide-react"

const nav = [
  { to: "/pos",        icon: ShoppingCart, label: "Caja",       roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/products",   icon: Package,      label: "Productos",   roles: ["ADMIN","JEFE"] },
  { to: "/inventory",  icon: Boxes,        label: "Inventario",  roles: ["ADMIN","JEFE","VENDEDOR"] },
  { to: "/sales",      icon: ClipboardList,label: "Ventas",      roles: ["ADMIN","JEFE"] },
  { to: "/dashboard",  icon: BarChart3,    label: "Dashboard",   roles: ["ADMIN","JEFE"] },
  { to: "/settings",   icon: Settings,     label: "Config.",     roles: ["ADMIN"] },
]

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate("/login") }

  const visibleNav = nav.filter(n => n.roles.includes(user?.role))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside className="flex flex-col w-16 md:w-56 shrink-0 border-r transition-all duration-200"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-white text-sm"
            style={{ background: "var(--brand)" }}>
            A
          </div>
          <span className="hidden md:block font-display font-bold text-lg tracking-tight"
            style={{ color: "var(--text-primary)" }}>
            Aukani
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group
                ${isActive
                  ? "font-semibold"
                  : "hover:opacity-80"}`
              }
              style={({ isActive }) => ({
                background: isActive ? "var(--brand-light)" : "transparent",
                color: isActive ? "var(--brand)" : "var(--text-secondary)",
              })}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:block text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
          {/* User */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-md"
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

          {/* Theme toggle */}
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden md:block text-sm">{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
          </button>

          {/* Logout */}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 hover:opacity-80"
            style={{ color: "var(--danger)" }}>
            <LogOut size={16} />
            <span className="hidden md:block text-sm">Salir</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}