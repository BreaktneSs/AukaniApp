// Checkbox estilizado con marca SVG personalizada
export default function Checkbox({ checked, onChange, label, sublabel, id }) {
  const uid = id || Math.random().toString(36).slice(2)
  return (
    <label htmlFor={uid} className="flex items-start gap-2.5 cursor-pointer select-none group">
      <div className="relative shrink-0 mt-0.5">
        <input
          id={uid}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className="w-4 h-4 rounded transition-all duration-150"
          style={{
            background: checked ? "var(--brand)" : "var(--bg-primary)",
            border: `1.5px solid ${checked ? "var(--brand)" : "var(--border)"}`,
            boxShadow: checked ? "0 0 0 3px var(--brand-light)" : "none",
          }}
        >
          {checked && (
            <svg viewBox="0 0 12 12" fill="none" className="w-full h-full p-0.5">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      {(label || sublabel) && (
        <div>
          {label && (
            <p className="text-sm font-medium leading-tight transition-colors"
              style={{ color: checked ? "var(--brand)" : "var(--text-secondary)" }}>
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sublabel}</p>
          )}
        </div>
      )}
    </label>
  )
}
