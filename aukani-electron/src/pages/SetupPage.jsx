import { useState } from "react"
import { Loader2, ServerCrash, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"

const FINGERPRINT = "Aukani POS API running"

function normalizeUrl(raw) {
  let url = raw.trim().replace(/\/$/, "")
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`
  return url
}

async function verifyServer(url) {
  const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) return false
  const data = await res.json()
  return typeof data.status === "string" && data.status.includes(FINGERPRINT)
}

export default function SetupPage() {
  const [url, setUrl] = useState("http://")
  const [state, setState] = useState("idle") // idle | checking | ok | error

  const handleSubmit = async (e) => {
    e.preventDefault()
    const normalized = normalizeUrl(url)
    setState("checking")
    try {
      const ok = await verifyServer(normalized)
      if (!ok) { setState("error"); return }
      setState("ok")
      await window.electronAPI.setServerUrl(normalized)
      setTimeout(() => window.electronAPI.relaunch(), 800)
    } catch {
      setState("error")
    }
  }

  return (
    <div className="flex items-center justify-center p-4"
      style={{ minHeight: "calc(100vh - 32px)", background: "var(--bg-primary)" }}>
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
            Configuración inicial
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
              Conectar al servidor
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Ingresa la dirección del servidor Aukani en tu red local. Esta configuración se guarda de forma segura en este equipo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                URL del servidor
              </label>
              <input
                type="text"
                className="input"
                placeholder="http://192.168.1.10:3000"
                value={url}
                onChange={e => { setUrl(e.target.value); setState("idle") }}
                disabled={state === "checking" || state === "ok"}
                autoFocus
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Ejemplo: http://192.168.1.10:3000
              </p>
            </div>

            {/* Feedback de verificación */}
            {state === "error" && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
                <ServerCrash size={15} style={{ color: "var(--danger)", marginTop: 1, shrink: 0 }} />
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  No se pudo conectar. Verifica que la URL sea correcta y que el servidor esté encendido.
                </p>
              </div>
            )}

            {state === "ok" && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{ background: "var(--brand-light)", border: "1px solid var(--brand)" }}>
                <CheckCircle2 size={15} style={{ color: "var(--brand)" }} />
                <p className="text-xs font-medium" style={{ color: "var(--brand)" }}>
                  Servidor verificado — reiniciando...
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={state === "checking" || state === "ok" || !url.trim()}
              className="btn-primary btn-md w-full">
              {state === "checking"
                ? <><Loader2 size={15} className="animate-spin" /> Verificando...</>
                : "Verificar y continuar"}
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
