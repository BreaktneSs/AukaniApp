import { useState } from "react"
import { Loader2, Eye, EyeOff, Link2, Unlink } from "lucide-react"
import toast from "react-hot-toast"

// Modal "Acceso remoto" — se puede abrir proactivamente (ícono en el login o en la
// configuración inicial) o reactivamente (cuando falla un intento de login, o la
// verificación del servidor en SetupPage, por falta de red)
export default function RemoteAccessModal({ onClose, onConnected }) {
  const saved = window.electronAPI?.remoteAccessConfig || {}
  const [host, setHost] = useState(saved.host || "")
  const [port, setPort] = useState(saved.port || "22")
  const [username, setUsername] = useState(saved.username || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState("checking") // checking | idle | connecting | connected | error
  const [error, setError] = useState("")

  // Al abrir: puede que ya haya un túnel activo (conectado antes en esta misma sesión)
  useState(() => {
    window.electronAPI.remoteStatus().then(({ connected, info }) => {
      if (connected && info) {
        setHost(info.host); setPort(String(info.port)); setUsername(info.username)
        setStatus("connected")
      } else {
        setStatus("idle")
      }
    })
  })

  const handleConnect = async (e) => {
    e.preventDefault()
    setStatus("connecting")
    setError("")
    const result = await window.electronAPI.remoteConnect({ host: host.trim(), port, username: username.trim(), password })
    if (result.ok) {
      toast.success("Túnel remoto conectado")
      setStatus("connected")
      setPassword("")
      onConnected()
    } else {
      setStatus("error")
      setError(result.error || "No se pudo conectar")
    }
  }

  const handleDisconnect = async () => {
    await window.electronAPI.remoteDisconnect()
    setStatus("idle")
    toast.success("Desconectado — volviste a la red local")
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

        {status === "checking" ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : status === "connected" ? (
          <div className="space-y-3">
            <div className="card p-4 flex items-center gap-3" style={{ background: "var(--brand-light)" }}>
              <Link2 size={18} style={{ color: "var(--brand)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>Conectado</p>
                <p className="text-xs" style={{ color: "var(--brand)" }}>{username}@{host}:{port}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-outline btn-md flex-1">Cerrar</button>
              <button onClick={handleDisconnect} className="btn-md flex-1 text-white flex items-center justify-center gap-2"
                style={{ background: "var(--danger)" }}>
                <Unlink size={14} /> Desconectar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Conecta por túnel SSH para llegar al servidor cuando no estás en la red local.
            </p>

            <form onSubmit={handleConnect} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Host</label>
                  <input type="text" className="input" required autoFocus placeholder="192.168.0.101"
                    value={host} onChange={e => setHost(e.target.value)} disabled={status === "connecting"} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Puerto</label>
                  <input type="text" inputMode="numeric" className="input" required placeholder="22"
                    value={port} onChange={e => setPort(e.target.value.replace(/\D/g, ""))} disabled={status === "connecting"} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Usuario SSH</label>
                <input type="text" className="input" required
                  value={username} onChange={e => setUsername(e.target.value)} disabled={status === "connecting"} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Contraseña SSH</label>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                  <input
                    type={showPassword ? "text" : "password"} required autoComplete="off"
                    className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                    style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
                    value={password} onChange={e => setPassword(e.target.value)}
                    disabled={status === "connecting"} placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="px-3 flex items-center" style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {status === "error" && (
                <div className="card px-3 py-2" style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
                  <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} disabled={status === "connecting"} className="btn-outline btn-md flex-1">Cancelar</button>
                <button type="submit" disabled={status === "connecting"} className="btn-primary btn-md flex-1 flex items-center justify-center gap-2">
                  {status === "connecting" ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  {status === "connecting" ? "Conectando..." : "Conectar"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
