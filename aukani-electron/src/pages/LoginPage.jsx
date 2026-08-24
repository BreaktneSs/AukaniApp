import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"
import { useThemeStore } from "@/store/theme.store"
import { authService } from "@/services/auth.service"
import { Sun, Moon, Loader2, ShieldCheck, ArrowLeft, KeyRound, Eye, EyeOff, Link2 } from "lucide-react"
import toast from "react-hot-toast"
import { confirm } from "@/components/ui/ConfirmDialog"

// Modal "Acceso remoto" — para cuando no hay conexión con el servidor (fuera de la LAN)
function RemoteAccessModal({ onClose, onConnected }) {
  const saved = window.electronAPI?.remoteAccessConfig || {}
  const [host, setHost] = useState(saved.host || "")
  const [port, setPort] = useState(saved.port || "22")
  const [username, setUsername] = useState(saved.username || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleConnect = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const result = await window.electronAPI.remoteConnect({ host: host.trim(), port, username: username.trim(), password })
    setLoading(false)
    if (result.ok) {
      toast.success("Túnel remoto conectado")
      onConnected()
    } else {
      setError(result.error || "No se pudo conectar")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-sm animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Link2 size={18} style={{ color: "var(--brand)" }} />
          <h2 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
            Acceso remoto
          </h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Conecta por túnel SSH para llegar al servidor cuando no estás en la red local. Al conectar, se reintenta el inicio de sesión automáticamente.
        </p>

        <form onSubmit={handleConnect} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Host</label>
              <input type="text" className="input" required autoFocus placeholder="192.168.0.101"
                value={host} onChange={e => setHost(e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Puerto</label>
              <input type="text" inputMode="numeric" className="input" required placeholder="22"
                value={port} onChange={e => setPort(e.target.value.replace(/\D/g, ""))} disabled={loading} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Usuario SSH</label>
            <input type="text" className="input" required
              value={username} onChange={e => setUsername(e.target.value)} disabled={loading} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Contraseña SSH</label>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              <input
                type={showPassword ? "text" : "password"} required autoComplete="off"
                className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
                value={password} onChange={e => setPassword(e.target.value)}
                disabled={loading} placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="px-3 flex items-center" style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="card px-3 py-2" style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
              <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary btn-md flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              {loading ? "Conectando..." : "Conectar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal "Olvidé mi contraseña" — solo funciona si la cuenta tiene TOTP activo
function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState("email") // "email" | "reset"
  const [username, setUsername] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const email = `${username.trim()}@aukani.com`

  const handleCheck = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    try {
      const { totpEnabled } = await authService.canResetWithTotp(email)
      if (!totpEnabled) {
        toast.error("No puedes restablecer tu contraseña. Contacta a un administrador.")
        onClose()
        return
      }
      setStep("reset")
    } catch {
      toast.error("No puedes restablecer tu contraseña. Contacta a un administrador.")
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return }
    if (newPassword.length < 6) { toast.error("Mínimo 6 caracteres"); return }
    if (code.length !== 6) return
    setLoading(true)
    try {
      await authService.resetPasswordWithTotp(email, code, newPassword)
      toast.success("Contraseña actualizada, ya puedes iniciar sesión")
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || "Código incorrecto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-sm animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <KeyRound size={18} style={{ color: "var(--brand)" }} />
          <h2 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
            Restablecer contraseña
          </h2>
        </div>

        {step === "email" ? (
          <form onSubmit={handleCheck} className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Solo disponible para cuentas con verificación en dos pasos activa.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Usuario</label>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <input
                  type="text" autoFocus
                  className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
                  disabled={loading}
                />
                <span className="px-3 flex items-center text-sm select-none shrink-0"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", borderLeft: "1px solid var(--border)" }}>
                  @aukani.com
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
              <button type="submit" disabled={loading || !username.trim()} className="btn-primary btn-md flex-1">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Continuar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Código de tu app de autenticación
              </label>
              <input
                type="text" inputMode="numeric" maxLength={6} autoFocus
                className="input text-center tracking-[0.4em] font-semibold"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nueva contraseña</label>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <input
                  type={showPassword ? "text" : "password"} required minLength={6}
                  className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="px-3 flex items-center" style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Confirmar nueva contraseña</label>
              <input
                type={showPassword ? "text" : "password"} required
                className="input"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña" disabled={loading}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
              <button type="submit" disabled={loading || code.length !== 6} className="btn-primary btn-md flex-1">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Restablecer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState("credentials") // "credentials" | "2fa"
  const [tempToken, setTempToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [showRemoteModal, setShowRemoteModal] = useState(false)
  const { login } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()

  const attemptLogin = async () => {
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
      if (err.response) {
        toast.error(err.response.data?.error || "Credenciales incorrectas")
      } else {
        // No hubo respuesta del servidor — probablemente estás fuera de la red local
        const wantsRemote = await confirm({
          title: "No se pudo conectar al servidor",
          message: "Parece que no tienes acceso a la red local. ¿Quieres conectar por acceso remoto?",
          confirmLabel: "Conectar acceso remoto",
          variant: "brand",
        })
        if (wantsRemote) setShowRemoteModal(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    attemptLogin()
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

              <button type="button" onClick={() => setShowForgotModal(true)} disabled={loading}
                className="text-xs w-full text-center transition-colors"
                style={{ color: "var(--text-muted)" }}>
                ¿Olvidaste tu contraseña?
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

      {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}
      {showRemoteModal && (
        <RemoteAccessModal
          onClose={() => setShowRemoteModal(false)}
          onConnected={() => { setShowRemoteModal(false); attemptLogin() }}
        />
      )}
    </div>
  )
}