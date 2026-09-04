import api from "./api.js"
export const shiftsService = {
  open: (openingCash) => api.post("/shifts/open", { openingCash }).then(r => r.data),
  close: (id, data) => api.patch(`/shifts/${id}/close`, data).then(r => r.data),
  // 404 = "no hay turno abierto en este dispositivo", una respuesta válida, no un
  // error — se resuelve a null para que react-query reemplace cualquier turno viejo
  // en caché (si no, al cerrar el turno un admin desde Control de caja, la caja del
  // cajero se queda mostrando el turno cerrado como si siguiera abierto: react-query
  // conserva el último dato bueno cuando un refetch en segundo plano falla, así que
  // sin esto nunca se entera). Cualquier otro error (caída de red, 500, etc.) sí se
  // deja pasar como error de verdad.
  getActive: () => api.get("/shifts/active").then(r => r.data).catch(err => {
    if (err.response?.status === 404) return null
    throw err
  }),
  getMine: () => api.get("/shifts/mine").then(r => r.data),
  getAll: (params) => api.get("/shifts", { params }).then(r => r.data),
  getById: (id) => api.get(`/shifts/${id}`).then(r => r.data),
}