// Formatea un número en pesos colombianos (COP)
// Ejemplo: 15000 → $15.000
export function formatCOP(value) {
  const num = Number(value || 0)
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

// Versión compacta sin símbolo: 15000 → 15.000
export function formatNumber(value) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}