import { create } from "zustand"

// ── Helpers de persistencia ───────────────────────────────
const STORAGE_KEY = "aukani_sales"

function loadSales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSales(sales, activeId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sales, activeId }))
  } catch {}
}

function createSale(id) {
  return { id, label: `Venta ${id}`, items: [], createdAt: new Date().toISOString() }
}

// ── Estado inicial ────────────────────────────────────────
const stored = loadSales()
const initialSales = stored?.sales?.length ? stored.sales : [createSale(1)]
const initialActiveId = stored?.activeId ?? initialSales[0].id
const initialNextId = stored?.sales ? Math.max(...stored.sales.map(s => s.id)) + 1 : 2

// ── Store ─────────────────────────────────────────────────
export const useCartStore = create((set, get) => ({
  sales: initialSales,
  activeId: initialActiveId,
  nextId: initialNextId,
  shiftId: null,

  // ── Turno ──────────────────────────────────────────────
  setShift: (shiftId) => set({ shiftId }),

  // ── Venta activa (computed) ───────────────────────────
  getActive: () => {
    const { sales, activeId } = get()
    return sales.find(s => s.id === activeId) || sales[0]
  },

  // ── Gestión de pestañas ───────────────────────────────
  newSale: () => {
    const { sales, nextId } = get()
    const sale = createSale(nextId)
    const updated = [...sales, sale]
    set({ sales: updated, activeId: nextId, nextId: nextId + 1 })
    saveSales(updated, nextId)
  },

  switchSale: (id) => {
    const { sales } = get()
    saveSales(sales, id)
    set({ activeId: id })
  },

  closeSale: (id) => {
    const { sales, activeId, nextId } = get()
    if (sales.length === 1) {
      // Si es la última, limpiarla en lugar de cerrarla
      const reset = [createSale(nextId)]
      set({ sales: reset, activeId: nextId, nextId: nextId + 1 })
      saveSales(reset, nextId)
      return
    }
    const updated = sales.filter(s => s.id !== id)
    const newActive = id === activeId ? updated[updated.length - 1].id : activeId
    set({ sales: updated, activeId: newActive })
    saveSales(updated, newActive)
  },

  renameSale: (id, label) => {
    const { sales, activeId } = get()
    const updated = sales.map(s => s.id === id ? { ...s, label } : s)
    set({ sales: updated })
    saveSales(updated, activeId)
  },

  // ── Items del carrito (opera sobre venta activa) ──────
  addItem: (product) => {
    const { sales, activeId } = get()
    const updated = sales.map(s => {
      if (s.id !== activeId) return s
      const existing = s.items.find(i => i.id === product.id)
      const items = existing
        ? s.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...s.items, { ...product, quantity: 1 }]
      return { ...s, items }
    })
    set({ sales: updated })
    saveSales(updated, activeId)
  },

  removeItem: (productId) => {
    const { sales, activeId } = get()
    const updated = sales.map(s => {
      if (s.id !== activeId) return s
      return { ...s, items: s.items.filter(i => i.id !== productId) }
    })
    set({ sales: updated })
    saveSales(updated, activeId)
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) { get().removeItem(productId); return }
    const { sales, activeId } = get()
    const updated = sales.map(s => {
      if (s.id !== activeId) return s
      return { ...s, items: s.items.map(i => i.id === productId ? { ...i, quantity } : i) }
    })
    set({ sales: updated })
    saveSales(updated, activeId)
  },

  clearActive: () => {
    const { sales, activeId } = get()
    const updated = sales.map(s => s.id === activeId ? { ...s, items: [] } : s)
    set({ sales: updated })
    saveSales(updated, activeId)
  },

  // ── Totales ───────────────────────────────────────────
  getTotal: () => {
    const active = get().getActive()
    return (active?.items || []).reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)
  },

  getCount: () => {
    const active = get().getActive()
    return (active?.items || []).reduce((sum, i) => sum + i.quantity, 0)
  },

  getTotalItems: () => {
    // Total de items en TODAS las ventas (para badge global)
    return get().sales.reduce((sum, s) => sum + s.items.reduce((ss, i) => ss + i.quantity, 0), 0)
  },
}))