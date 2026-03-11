import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersService } from "@/services/orders.service"
import { ClipboardList, Eye, XCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import toast from "react-hot-toast"

const STATUS = {
  COMPLETED: { label: "Completada", color: "var(--brand)", bg: "var(--brand-light)" },
  CANCELLED: { label: "Cancelada",  color: "var(--danger)", bg: "var(--danger-light)" },
  REFUNDED:  { label: "Reembolsada",color: "var(--warning)", bg: "var(--warning-light)" },
}

function OrderDetail({ order, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            Venta #{order.id}
          </h2>
          <span className="badge text-xs" style={{ background: STATUS[order.status]?.bg, color: STATUS[order.status]?.color }}>
            {STATUS[order.status]?.label}
          </span>
        </div>
        <div className="space-y-2 mb-4">
          {order.items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>{item.product?.name} × {item.quantity}</span>
              <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-1" style={{ borderColor: "var(--border)" }}>
          {order.payments?.map(p => (
            <div key={p.id} className="flex justify-between text-sm">
              <span style={{ color: "var(--text-muted)" }}>{p.paymentMethod?.name}</span>
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>${Number(p.amount).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-1">
            <span style={{ color: "var(--text-primary)" }}>Total</span>
            <span className="font-mono" style={{ color: "var(--brand)" }}>${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Cajero: {order.user?.name} · {new Date(order.createdAt).toLocaleString()}
        </div>
        <button onClick={onClose} className="btn-outline btn-md w-full mt-4">Cerrar</button>
      </div>
    </div>
  )
}

export default function SalesPage() {
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => ordersService.getAll({ page, limit: 20 }),
  })

  const cancel = useMutation({
    mutationFn: ordersService.cancel,
    onSuccess: () => { toast.success("Venta cancelada"); qc.invalidateQueries({ queryKey: ["orders"] }) },
    onError: e => toast.error(e.response?.data?.error || "Error"),
  })

  const orders = data?.orders || []
  const total = data?.total || 0
  const pages = Math.ceil(total / 20)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Ventas</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{total} registros en total</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Cajero</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={o.id} className="border-b transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>#{o.id}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>{o.user?.name}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: "var(--brand)" }}>
                      ${Number(o.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge text-xs"
                        style={{ background: STATUS[o.status]?.bg, color: STATUS[o.status]?.color }}>
                        {STATUS[o.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => ordersService.getById(o.id).then(setDetail)}
                          className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
                          <Eye size={13} />
                        </button>
                        {o.status === "COMPLETED" && (
                          <button onClick={() => { if (confirm("¿Cancelar esta venta?")) cancel.mutate(o.id) }}
                            className="w-7 h-7 rounded flex items-center justify-center btn-ghost"
                            style={{ color: "var(--danger)" }}>
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Página {page} de {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-outline btn-sm">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page === pages} className="btn-outline btn-sm">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}