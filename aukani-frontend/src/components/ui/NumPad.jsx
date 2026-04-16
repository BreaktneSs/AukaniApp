import { useState, useEffect } from "react"
import { X, Delete, Check } from "lucide-react"

export default function NumPad({ initialValue = 1, label, onConfirm, onClose }) {
  const [digits, setDigits] = useState(String(initialValue > 0 ? initialValue : 1))

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return }
      if (e.key === "Enter")  { handleConfirm(); return }
      if (e.key === "Backspace") { press("⌫"); return }
      if (/^[0-9]$/.test(e.key)) press(e.key)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  const press = (key) => {
    if (key === "⌫") {
      setDigits(prev => prev.length > 1 ? prev.slice(0, -1) : "0")
    } else if (key === "C") {
      setDigits("0")
    } else {
      setDigits(prev => {
        if (prev === "0") return key
        if (prev.length >= 4) return prev
        return prev + key
      })
    }
  }

  const handleConfirm = () => {
    const val = Math.max(1, parseInt(digits) || 1)
    onConfirm(val)
  }

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
    >
      <div
        className="card w-full max-w-[320px] mb-0 sm:mb-0 rounded-b-none sm:rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--bg-secondary)" }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {label || "Cantidad"}
          </p>
          <button
            onPointerDown={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-ghost">
            <X size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Display */}
        <div className="px-5 pb-4">
          <div className="rounded-xl px-5 py-3 flex items-center justify-end"
            style={{ background: "var(--bg-tertiary)", border: "1.5px solid var(--border)" }}>
            <span className="font-sans font-bold tracking-tight"
              style={{ fontSize: "2.75rem", lineHeight: 1, color: "var(--text-primary)" }}>
              {digits}
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
                onPointerDown={() => press(key)}
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
            onPointerDown={handleConfirm}
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
