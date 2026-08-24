import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useThemeStore } from "@/store/theme.store"
import { authService } from "@/services/auth.service"
import { Sun, Moon, Loader2, ShieldCheck, ArrowLeft } from "lucide-react"
import toast from "react-hot-toast"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState("credentials") // "credentials" | "2fa"
  const [tempToken, setTempToken] = useState(null)
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
      const result = await authService.login({ email, password })
      if (result.requires2FA) {
        setTempToken(result.tempToken)
        setStep("2fa")
        return
      }
      login(result.user, result.token)
      navigate("/pos")
    } catch (err) {
      toast.error(err.response?.data?.error || "Credenciales incorrectas")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e) => {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    try {
      const { user, token } = await authService.loginVerify2FA(tempToken, code)
      login(user, token)
      navigate("/pos")
    } catch (err) {
      toast.error(err.response?.data?.error || "Código incorrecto")
      setCode("")
    } finally {
      setLoading(false)
    }
  }

  const backToCredentials = () => {
    setStep("credentials")
    setTempToken(null)
    setCode("")
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
          {step === "credentials" ? (
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
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "var(--brand-light)", color: "var(--brand)" }}>
                  <ShieldCheck size={18} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Verificación en dos pasos
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Ingresa el código de tu app de autenticación
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className="input text-center tracking-[0.5em] text-lg font-semibold"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={loading}
              />

              <button type="submit" disabled={loading || code.length !== 6}
                className="btn-primary btn-md w-full">
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Verificando..." : "Verificar"}
              </button>

              <button type="button" onClick={backToCredentials} disabled={loading}
                className="btn-ghost btn-sm w-full flex items-center justify-center gap-1.5"
                style={{ color: "var(--text-muted)" }}>
                <ArrowLeft size={13} /> Volver
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Aukani POS v2.0
        </p>
      </div>
    </div>
  )
}