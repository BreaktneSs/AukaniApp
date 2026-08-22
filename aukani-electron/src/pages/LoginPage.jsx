import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useThemeStore } from "@/store/theme.store"
import { authService } from "@/services/auth.service"
import { Sun, Moon, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      const email = `${username.trim()}@aukani.com`
      const { user, token } = await authService.login({ email, password })
      login(user, token)
      navigate("/pos")
    } catch (err) {
      toast.error(err.response?.data?.error || "Credenciales incorrectas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: "var(--bg-primary)" }}>

      {/* Theme toggle */}
      <button onClick={toggle} className="absolute top-4 right-4 p-2 rounded-md transition-colors btn-ghost">
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 font-display font-bold text-white text-3xl"
            style={{ background: "var(--brand)" }}>
            A
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight" style={{ color: "var(--text-primary)" }}>
            Aukani POS
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sistema de punto de venta
          </p>
        </div>

        {/* Form */}
        <div className="card p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Usuario
              </label>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <input
                  type="text"
                  className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
                  placeholder="nombre"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
                  autoFocus
                  autoComplete="username"
                  disabled={loading}
                />
                <span className="px-3 flex items-center text-sm select-none shrink-0"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", borderLeft: "1px solid var(--border)" }}>
                  @aukani.com
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Contraseña
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary btn-md w-full mt-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Aukani POS v2.0
        </p>
      </div>
    </div>
  )
}