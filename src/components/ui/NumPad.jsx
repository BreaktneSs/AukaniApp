import { useState, useEffect, useRef } from "react"
import { X, Delete, Check } from "lucide-react"
import { formatNumber } from "@/utils/currency"

// mode="quantity" → entero ≥ 1, máx 4 dígitos
// mode="currency" → entero ≥ 0, máx 9 dígitos, display con formato de miles
export default function NumPad({ initialValue = 1, label, subtitle, onConfirm, onClose, mode = "quantity" }) {
  const isCurrency = mode === "currency"
  const initStr = String(Math.round(Math.max(0, Number(initialValue) || 0)))

  const [, tick] = useState(0)
  const digitsRef = useRef(initStr)
  const freshRef  = useRef(true)  // primer toque reemplaza el valor

  const setDigits = (val) => {
    digitsRef.current = val
    tick(n => n + 1)
  }

  const press = (key) => {
    const isFresh = freshRef.current
    freshRef.current = false

    if (key === "⌫") {
      const prev = digitsRef.current
      setDigits(prev.length > 1 ? prev.slice(0, -1) : "0")
    } else if (key === "C") {
      setDigits("0")
    } else {
      const base = isFresh ? "" : digitsRef.current
      const maxLen = isCurrency ? 9 : 4
      if (base === "" || base === "0") { setDigits(key); return }
      if (base.length >= maxLen) return
      setDigits(base + key)
    }
  }

  const handleConfirm = () => {
    const n = parseInt(digitsRef.current) || 0
    onConfirm(isCurrency ? n : Math.max(1, n))
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape")     { onClose(); return }
      if (e.key === "Enter")      { handleConfirm(); return }
      if (e.key === "Backspace")  { press("⌫"); return }
      if (/^[0-9]$/.test(e.key)) press(e.key)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const digits  = digitsRef.current
  const display = isCurrency ? formatNumber(parseInt(digits) || 0) : digits

  const rows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["C", "0", "⌫"],
  ]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onPointerDown={onClose}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-[320px] mb-0 sm:mb-0 rounded-b-none sm:rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--bg-secondary)" }}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "var(--text-muted)" }}>
              {label || (isCurrency ? "Precio" : "Cantidad")}
            </p>
            {subtitle && (
              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
            )}
          </div>
          <button
            onPointerDown={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-ghost shrink-0">
            <X size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Display */}
        <div className="px-5 pb-4 pt-2">
          <div className="rounded-xl px-5 py-3 flex items-center justify-end gap-2"
            style={{ background: "var(--bg-tertiary)", border: "1.5px solid var(--border)" }}>
            {isCurrency && (
              <span className="font-sans font-bold" style={{ fontSize: "1.5rem", color: "var(--text-muted)" }}>$</span>
            )}
            <span className="font-sans font-bold tracking-tight"
              style={{ fontSize: "2.75rem", lineHeight: 1, color: "var(--text-primary)" }}>
              {display}
            </span>
          </div>
        </div>

        {/* Keys */}
        <div className="grid grid-cols-3 gap-2.5 px-5 pb-3">
          {rows.flat().map((key) => {
            const isBack  = key === "⌫"
            const isClear = key === "C"
            return (
              <button
                key={key}
                onPointerDown={(e) => { e.stopPropagation(); press(key) }}
                className="h-[3.75rem] rounded-xl font-sans font-semibold text-xl flex items-center justify-center transition-all active:scale-95 select-none"
                style={{
                  background: isBack  ? "var(--danger-light)"  :
                               isClear ? "var(--warning-light)" :
                               "var(--bg-tertiary)",
                  color: isBack  ? "var(--danger)"  :
                         isClear ? "var(--warning)" :
                         "var(--text-primary)",
                  border: "1.5px solid var(--border)",
                }}
              >
                {isBack ? <Delete size={20} /> : key}
              </button>
            )
          })}
        </div>

        {/* Confirm */}
        <div className="px-5 pb-5">
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleConfirm() }}
            className="w-full rounded-xl font-sans font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] select-none"
            style={{
              height: "3.75rem",
              fontSize: "1.1rem",
              background: "var(--brand)",
              border: "1.5px solid var(--brand)",
            }}
          >
            <Check size={20} />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
