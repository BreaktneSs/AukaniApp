import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { auditService } from "@/services/audit.service"
import { ShieldCheck, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"

const ACTION_LABELS = {
  LOGIN:                "Inicio de sesión",
  USER_CREATE:          "Usuario creado",
  USER_UPDATE:          "Usuario modificado",
  USER_DEACTIVATE:      "Usuario desactivado",
  USER_PASSWORD_CHANGE: "Contraseña cambiada",
  PRODUCT_CREATE:       "Producto creado",
  PRODUCT_UPDATE:       "Producto modificado",
  PRODUCT_DELETE:       "Producto eliminado",
  SALE_CREATE:          "Venta realizada",
  SALE_CANCEL:          "Venta cancelada",
  SHIFT_OPEN:           "Turno abierto",
  SHIFT_CLOSE:          "Turno cerrado",
  SUBSHIFT_OPEN:        "Caja remota abierta",
  SUBSHIFT_CLOSE:       "Caja remota cerrada",
  DISPATCH_CREATE:      "Despacho creado",
  DISPATCH_CONFIRM:     "Despacho confirmado",
  DISPATCH_CANCEL:      "Despacho cancelado",
  INVENTORY_ENTRY:      "Entrada de inventario",
  INVENTORY_EXIT:       "Salida de inventario",
}

const ENTITY_LABELS = {
  AUTH: "Autenticación", USER: "Usuario", PRODUCT: "Producto",
  ORDER: "Venta", SHIFT: "Turno", SUBSHIFT: "Caja remota",
  DISPATCH: "Despacho", INVENTORY: "Inventario",
}

function actionStyle(action) {
  if (["SALE_CREATE","SHIFT_OPEN","SUBSHIFT_OPEN","DISPATCH_CONFIRM","USER_CREATE","PRODUCT_CREATE","INVENTORY_ENTRY","LOGIN"].includes(action))
    return { color: "var(--brand)", bg: "var(--brand-light)" }
  if (["SALE_CANCEL","DISPATCH_CANCEL","USER_DEACTIVATE","PRODUCT_DELETE","INVENTORY_EXIT"].includes(action))
    return { color: "var(--danger)", bg: "var(--danger-light)" }
  if (["SHIFT_CLOSE","SUBSHIFT_CLOSE","USER_UPDATE","PRODUCT_UPDATE","USER_PASSWORD_CHANGE"].includes(action))
    return { color: "var(--warning)", bg: "var(--warning-light)" }
  return { color: "var(--text-muted)", bg: "var(--bg-tertiary)" }
}

// ── Modal de detalle ──────────────────────────────────────
function LogDetail({ log, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>Detalle del evento</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
            <X size={15} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ["Acción",  ACTION_LABELS[log.action] || log.action],
            ["Entidad", `${ENTITY_LABELS[log.entity] || log.entity}${log.entityId ? ` #${log.entityId}` : ""}`],
            ["Objeto",  log.entityLabel || "—"],
            ["Usuario", `${log.userName} (${log.userRole})`],
            ["IP",      log.ip || "—"],
            ["Fecha",   new Date(log.createdAt).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="shrink-0" style={{ color: "var(--text-muted)" }}>{label}</span>
              <span className="text-right" style={{ color: "var(--text-primary)" }}>{value}</span>
            </div>
          ))}
        </div>
        {log.oldValues && (
          <div className="mt-4">
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Antes</p>
            <pre className="text-xs rounded p-2 overflow-auto" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", maxHeight: "120px" }}>
              {JSON.stringify(log.oldValues, null, 2)}
            </pre>
          </div>
        )}
        {log.newValues && (
          <div className="mt-3">
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Después</p>
            <pre className="text-xs rounded p-2 overflow-auto" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", maxHeight: "120px" }}>
              {JSON.stringify(log.newValues, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AuditPage ─────────────────────────────────────────────
export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const [filters, setFilters] = useState({ from: "", to: "", action: "", entity: "" })

  const { data, isLoading } = useQuery({
    queryKey: ["audit", page, filters],
    queryFn: () => auditService.getAll({
      page, limit: 50,
      from:   filters.from   || undefined,
      to:     filters.to     || undefined,
      action: filters.action || undefined,
      entity: filters.entity || undefined,
    }),
  })

  const logs  = data?.logs  || []
  const total = data?.total || 0
  const pages = Math.ceil(total / 50) || 1

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1) }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck size={22} style={{ color: "var(--brand)" }} />
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Auditoría</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{total} eventos registrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Desde</label>
            <input type="date" className="input w-full text-sm"
              value={filters.from} onChange={e => setFilter("from", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Hasta</label>
            <input type="date" className="input w-full text-sm"
              value={filters.to} onChange={e => setFilter("to", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Acción</label>
            <select className="input w-full text-sm"
              value={filters.action} onChange={e => setFilter("action", e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Entidad</label>
            <select className="input w-full text-sm"
              value={filters.entity} onChange={e => setFilter("entity", e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(ENTITY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Acción</th>
                  <th className="text-left px-4 py-3">Entidad</th>
                  <th className="text-left px-4 py-3">Objeto</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                      Sin eventos registrados
                    </td>
                  </tr>
                ) : logs.map((log, i) => {
                  const s = actionStyle(log.action)
                  const hasDetail = log.oldValues || log.newValues
                  return (
                    <tr key={log.id} className="border-b"
                      style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-primary)" }}>
                        {log.userName}
                        <span className="ml-1" style={{ color: "var(--text-muted)" }}>({log.userRole})</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="badge text-xs" style={{ background: s.bg, color: s.color }}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {ENTITY_LABELS[log.entity] || log.entity}
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-[180px] truncate" style={{ color: "var(--text-secondary)" }}>
                        {log.entityLabel || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {log.ip || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {hasDetail && (
                          <button onClick={() => setDetail(log)}
                            className="text-xs px-2 py-0.5 rounded btn-ghost"
                            style={{ color: "var(--text-muted)" }}>
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Página {page} de {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  className="btn-outline btn-sm"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(p => p + 1)} disabled={page === pages}
                  className="btn-outline btn-sm"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {detail && <LogDetail log={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
