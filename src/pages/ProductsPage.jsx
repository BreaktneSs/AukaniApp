import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsService } from "@/services/products.service"
import { categoriesService } from "@/services/catalog.service"
import { Plus, Search, Edit2, Trash2, Upload, Loader2, Package } from "lucide-react"
import toast from "react-hot-toast"

function ProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    price: product?.price || "",
    cost: product?.cost || "",
    stock: product?.stock || 0,
    minStock: product?.minStock || 0,
    barcode: product?.barcode || "",
    sku: product?.sku || "",
    categoryId: product?.categoryId || "",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, price: Number(form.price), cost: form.cost ? Number(form.cost) : undefined, stock: Number(form.stock), minStock: Number(form.minStock), categoryId: form.categoryId ? Number(form.categoryId) : undefined })
  }

  const field = (label, key, type = "text", props = {}) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input type={type} className="input" value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...props} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
          {product ? "Editar producto" : "Nuevo producto"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {field("Nombre *", "name", "text", { required: true, autoFocus: true })}
          <div className="grid grid-cols-2 gap-3">
            {field("Precio *", "price", "number", { required: true, min: 0, step: "0.01" })}
            {field("Costo", "cost", "number", { min: 0, step: "0.01" })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Stock", "stock", "number", { min: 0 })}
            {field("Stock mínimo", "minStock", "number", { min: 0 })}
          </div>
          {field("Código de barras", "barcode")}
          {field("SKU", "sku")}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Categoría</label>
            <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline btn-md flex-1">Cancelar</button>
            <button type="submit" className="btn-primary btn-md flex-1">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [query, setQuery] = useState("")
  const [modal, setModal] = useState(null) // null | "new" | product
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["products", query],
    queryFn: () => query ? productsService.search(query) : productsService.getAll({ limit: 100 }).then(r => r.products),
  })

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: categoriesService.getAll })

  const create = useMutation({ mutationFn: productsService.create, onSuccess: () => { toast.success("Producto creado"); qc.invalidateQueries({ queryKey: ["products"] }); setModal(null) }, onError: e => toast.error(e.response?.data?.error || "Error") })
  const update = useMutation({ mutationFn: ({ id, data }) => productsService.update(id, data), onSuccess: () => { toast.success("Producto actualizado"); qc.invalidateQueries({ queryKey: ["products"] }); setModal(null) }, onError: e => toast.error(e.response?.data?.error || "Error") })
  const remove = useMutation({ mutationFn: productsService.delete, onSuccess: () => { toast.success("Producto desactivado"); qc.invalidateQueries({ queryKey: ["products"] }) }, onError: e => toast.error(e.response?.data?.error || "Error") })

  const products = Array.isArray(data) ? data : data?.products || []

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: "var(--text-primary)" }}>Productos</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{products.length} productos</p>
        </div>
        <button onClick={() => setModal("new")} className="btn-primary btn-md">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input className="input pl-9" placeholder="Buscar productos..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={32} style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No hay productos</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-right px-4 py-3">Precio</th>
                  <th className="text-right px-4 py-3">Costo</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-left px-4 py-3">Categoría</th>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} className="border-b transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.imageUrl ? (
                          <img src={`/api${p.imageUrl}`} alt={p.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
                            <Package size={14} style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: "var(--brand)" }}>
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.cost ? `$${Number(p.cost).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="badge font-mono"
                        style={{ background: p.stock <= p.minStock ? "var(--warning-light)" : "var(--brand-light)", color: p.stock <= p.minStock ? "var(--warning)" : "var(--brand)" }}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{p.category?.name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>{p.barcode || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(p)} className="btn-ghost w-7 h-7 rounded flex items-center justify-center">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => { if (confirm(`¿Desactivar "${p.name}"?`)) remove.mutate(p.id) }}
                          className="w-7 h-7 rounded flex items-center justify-center btn-ghost" style={{ color: "var(--danger)" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ProductModal
          product={modal === "new" ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={(data) => modal === "new" ? create.mutate(data) : update.mutate({ id: modal.id, data })}
        />
      )}
    </div>
  )
}