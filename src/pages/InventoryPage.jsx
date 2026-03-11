import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryService } from "@/services/inventory.service"
import { productsService } from "@/services/products.service"
import { useAuthStore } from "@/store/auth.store"
import { Plus, Minus, Loader2, Boxes } from "lucide-react"
import toast from "react-hot-toast"

function MovementModal({ type, onClose, onSave, products }) {
  const [form, setForm] = useState({ productId: "", quantity: 1, reason: "" })
  const isEntry = type === "ENTRY"

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.productId) return
    onSave({ ...form, productId: Number(form.productId), quantity: Number(form.quantity) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
          {isEntry ? "📦 Entrada de stock" : "📤 Salida manual"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Producto *</label>
            <select className="input" required value={form.productId}
              onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Seleccionar producto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Cantidad *</label>
            <input type="number" className="input" min={1} required value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Motivo</label>
            <input type="text" className="input" placeholder={isEntry ? "Compra a proveedor..." : "Producto dañado..."}
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" className="btn-md flex-1 text-white"
              style={{ background: isEntry ? "var(--brand)" : "var(--danger)" }}>
              {isEntry ? "Registrar entrada" : "Registrar salida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const TYPE_LABELS = { ENTRY: { label: "Entrada", color: "var(--brand)", bg: "var(--brand-light)" }, EXIT: { label: "Salida", color: "var(--danger)", bg: "var(--danger-light)" }, SALE: { label: "Venta", color: "var(--info)", bg: "#dbeafe" } }

export default function InventoryPage() {
  const [modal, setModal] = useState(null)
  const [page, setPage] = useState(1)
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const canExit = ["ADMIN", "JEFE"].includes(user?.role)

  const { data, isLoading } = useQuery({
    queryKey: ["movements", page],
    queryFn: () => inventoryService.getMovements({ page, limit: 30 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ["products-list"],
    queryFn: () => productsService.getAll({ limit: 200 }).then(r => r.products),
  })

  const entry = useMutation({ mutationFn: inventoryService.entry, onSuccess: () => { toast.success("Entrada registrada"); qc.invalidateQueries({ queryKey: ["movements"] }); setModal(null) }, onError: e => toast.error(e.response?.data?.error || "Error") })
  const exit = useMutation({ mutationFn: inventoryService.exit, onSuccess: () => { toast.success("Salida registrada"); qc.invalidateQueries({ queryKey: ["movements"] }); setModal(null) }, onError: e => toast.error(e.response?.data?.error || "Error") })

  const movements = data?.movements || []

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Inventario</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Historial de movimientos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal("ENTRY")} className="btn-primary btn-md">
            <Plus size={15} /> Entrada
          </button>
          {canExit && (
            <button onClick={() => setModal("EXIT")} className="btn-md text-white" style={{ background: "var(--danger)" }}>
              <Minus size={15} /> Salida
            </button>
          )}
        </div>
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
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Cantidad</th>
                  <th className="text-left px-4 py-3">Motivo</th>
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={m.id} className="border-b" style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{m.product?.name}</td>
                    <td className="px-4 py-3">
                      <span className="badge text-xs" style={{ background: TYPE_LABELS[m.type]?.bg, color: TYPE_LABELS[m.type]?.color }}>
                        {TYPE_LABELS[m.type]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold"
                      style={{ color: m.type === "ENTRY" ? "var(--brand)" : "var(--danger)" }}>
                      {m.type === "ENTRY" ? "+" : "-"}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{m.reason || "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{m.user?.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <MovementModal type={modal} products={productsData || []}
          onClose={() => setModal(null)}
          onSave={(data) => modal === "ENTRY" ? entry.mutate(data) : exit.mutate(data)} />
      )}
    </div>
  )
}