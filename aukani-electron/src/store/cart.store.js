import { create } from "zustand"

// ── Helpers de persistencia ───────────────────────────────
const STORAGE_KEY = "aukani_sales"

function loadSales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSales(sales, activeId, nextLocalNum) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sales, activeId, nextLocalNum }))
  } catch {}
}

function createSale(id, localNum) {
  return { id, localNum, label: `Venta ${localNum}`, items: [], type: "sale", createdAt: new Date().toISOString() }
}

function createAccount(id, name, backendId = null) {
  return { id, name, label: name, items: [], remoteItems: [], type: "account", backendId, createdAt: new Date().toISOString() }
}

// ── Estado inicial ────────────────────────────────────────
const stored = loadSales()
const initialSales = stored?.sales?.length
  ? stored.sales.map(s => ({
      ...s,
      type: s.type ?? "sale",
      remoteItems: s.remoteItems ?? [],
      backendId: s.backendId ?? null,
    }))
  : [createSale(1, 1)]
const initialActiveId = stored?.activeId ?? initialSales[0].id
const initialNextId = stored?.sales ? Math.max(...stored.sales.map(s => s.id)) + 1 : 2
// Compatibilidad con ventas viejas que no tienen localNum
const initialNextLocalNum = stored?.nextLocalNum
  ?? (stored?.sales ? Math.max(...stored.sales.map(s => s.localNum ?? s.id)) + 1 : 2)

// ── Store ─────────────────────────────────────────────────
export const useCartStore = create((set, get) => ({
  sales: initialSales,
  activeId: initialActiveId,
  nextId: initialNextId,
  nextLocalNum: initialNextLocalNum,
  shiftId: null,
  flashingTabId: null,

  // ── Turno ──────────────────────────────────────────────
  setShift: (shiftId) => set({ shiftId }),

  // Llama al abrir un turno nuevo: reinicia la numeración local y limpia las pestañas
  resetForNewShift: (shiftId) => {
    const { nextId } = get()
    const sale = createSale(nextId, 1)
    const updated = [sale]
    set({ sales: updated, activeId: nextId, nextId: nextId + 1, nextLocalNum: 2, shiftId })
    saveSales(updated, nextId, 2)
  },

  // ── Venta activa (computed) ───────────────────────────
  getActive: () => {
    const { sales, activeId } = get()
    return sales.find(s => s.id === activeId) || sales[0]
  },

  // ── Gestión de pestañas ───────────────────────────────
  newSale: () => {
    const { sales, nextId, nextLocalNum } = get()
    const sale = createSale(nextId, nextLocalNum)
    const updated = [...sales, sale]
    set({ sales: updated, activeId: nextId, nextId: nextId + 1, nextLocalNum: nextLocalNum + 1 })
    saveSales(updated, nextId, nextLocalNum + 1)
  },

  newAccount: (name, backendId = null) => {
    const { sales, nextId, nextLocalNum } = get()
    const account = createAccount(nextId, name, backendId)
    const updated = [...sales, account]
    set({ sales: updated, activeId: nextId, nextId: nextId + 1 })
    saveSales(updated, nextId, nextLocalNum)
  },

  // Vincula el backendId una vez que el backend confirma la creación
  setAccountBackendId: (storeId, backendId) => {
    const { sales, activeId, nextLocalNum } = get()
    const updated = sales.map(s => s.id === storeId ? { ...s, backendId } : s)
    set({ sales: updated })
    saveSales(updated, activeId, nextLocalNum)
  },

  // Actualiza los items remotos (desde despachos confirmados) de una cuenta
  updateAccountRemoteItems: (backendId, remoteItems) => {
    const { sales } = get()
    const updated = sales.map(s =>
      s.type === "account" && s.backendId === backendId ? { ...s, remoteItems } : s
    )
    set({ sales: updated })
    // No persistir en localStorage — se re-fetchen en cada carga
  },

  switchSale: (id) => {
    const { sales, nextLocalNum } = get()
    saveSales(sales, id, nextLocalNum)
    set({ activeId: id })
  },

  closeSale: (id) => {
    const { sales, activeId, nextId, nextLocalNum } = get()
    if (sales.length === 1) {
      // Última pestaña: reemplazar con una nueva en lugar de cerrar
      const reset = [createSale(nextId, nextLocalNum)]
      set({ sales: reset, activeId: nextId, nextId: nextId + 1, nextLocalNum: nextLocalNum + 1 })
      saveSales(reset, nextId, nextLocalNum + 1)
      return
    }
    const updated = sales.filter(s => s.id !== id)
    const newActive = id === activeId ? updated[updated.length - 1].id : activeId
    set({ sales: updated, activeId: newActive })
    saveSales(updated, newActive, nextLocalNum)
  },

  // Cierra la venta dada y navega a una genérica vacía existente o crea una nueva
  closeSaleAndNew: (id) => {
    const { sales, nextId, nextLocalNum } = get()
    const remaining = sales.filter(s => s.id !== id)

    const emptyGeneric = remaining.find(s => s.type !== "account" && s.items.length === 0)
    if (emptyGeneric) {
      set({ sales: remaining, activeId: emptyGeneric.id, flashingTabId: emptyGeneric.id })
      saveSales(remaining, emptyGeneric.id, nextLocalNum)
      return
    }

    const newId = nextId
    const fresh = createSale(newId, nextLocalNum)
    const updated = [...remaining, fresh]
    set({ sales: updated, activeId: newId, nextId: nextId + 1, nextLocalNum: nextLocalNum + 1, flashingTabId: newId })
    saveSales(updated, newId, nextLocalNum + 1)
  },

  clearFlashingTab: () => set({ flashingTabId: null }),

  // ── Items del carrito (opera sobre venta activa) ──────
  addItem: (product) => {
    const { sales, activeId, nextLocalNum } = get()
    const updated = sales.map(s => {
      if (s.id !== activeId) return s
      const existing = s.items.find(i => i.id === product.id)
      const items = existing
        ? s.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...s.items, { ...product, quantity: 1 }]
      return { ...s, items }
    })
    set({ sales: updated })
    saveSales(updated, activeId, nextLocalNum)
  },

  removeItem: (productId) => {
    const { sales, activeId, nextLocalNum } = get()
    const updated = sales.map(s => {
      if (s.id !== activeId) return s
      return { ...s, items: s.items.filter(i => i.id !== productId) }
    })
    set({ sales: updated })
    saveSales(updated, activeId, nextLocalNum)
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) { get().removeItem(productId); return }
    const { sales, activeId, nextLocalNum } = get()
    const updated = sales.map(s => {
      if (s.id !== activeId) return s
      return { ...s, items: s.items.map(i => i.id === productId ? { ...i, quantity } : i) }
    })
    set({ sales: updated })
    saveSales(updated, activeId, nextLocalNum)
  },

  updateItemPrice: (productId, newPrice, note) => {
    const { sales, activeId, nextLocalNum } = get()
    const updated = sales.map(s => {
      if (s.id !== activeId) return s
      return {
        ...s,
        items: s.items.map(i => {
          if (i.id !== productId) return i
          return {
            ...i,
            price: newPrice,
            originalPrice: i.originalPrice ?? i.price,
            priceNote: note || undefined,
          }
        }),
      }
    })
    set({ sales: updated })
    saveSales(updated, activeId, nextLocalNum)
  },

  clearActive: () => {
    const { sales, activeId, nextLocalNum } = get()
    const updated = sales.map(s => s.id === activeId ? { ...s, items: [] } : s)
    set({ sales: updated })
    saveSales(updated, activeId, nextLocalNum)
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
    return get().sales.reduce((sum, s) => sum + s.items.reduce((ss, i) => ss + i.quantity, 0), 0)
  },
}))
