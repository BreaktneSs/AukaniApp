import { useState, useCallback } from "react"
import { AlertTriangle, X } from "lucide-react"

// ── Componente visual ─────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", variant = "danger", onConfirm, onCancel }) {
  const colors = {
    danger:  { bg: "var(--danger-light)",  color: "var(--danger)",  btn: "var(--danger)" },
    warning: { bg: "var(--warning-light)", color: "var(--warning)", btn: "var(--warning)" },
    brand:   { bg: "var(--brand-light)",   color: "var(--brand)",   btn: "var(--brand)" },
  }
  const c = colors[variant] || colors.danger

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onCancel}>
      <div
        className="card p-6 w-full max-w-sm animate-slide-up space-y-4"
        onClick={e => e.stopPropagation()}>

        {/* Icono + título */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: c.bg }}>
            <AlertTriangle size={20} style={{ color: c.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
            {message && (
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {message}
              </p>
            )}
          </div>
          <button onClick={onCancel}
            className="btn-ghost w-6 h-6 rounded flex items-center justify-center shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-outline btn-md flex-1">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-md flex-1 text-white font-semibold"
            style={{ background: c.btn }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hook para usar el dialog desde cualquier componente ───
let globalShowConfirm = null

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  globalShowConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        ...options,
        onConfirm: () => { setState(null); resolve(true) },
        onCancel:  () => { setState(null); resolve(false) },
      })
    })
  }, [])

  return (
    <>
      {children}
      {state && <ConfirmDialog {...state} />}
    </>
  )
}

// Función global — usar en cualquier sitio sin props
// Uso: const ok = await confirm({ title: "¿Eliminar?", message: "Esta acción no se puede deshacer." })
export async function confirm(options) {
  if (!globalShowConfirm) return window.confirm(options?.title || "¿Confirmar?")
  return globalShowConfirm(options)
}