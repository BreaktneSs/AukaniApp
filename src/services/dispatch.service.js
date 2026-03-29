import api from "./api.js"

export const dispatchService = {
  // Sub-turnos
  getMySubShift: () => api.get("/subshifts/mine").then(r => r.data),
  openSubShift: (parentShiftId) => api.post("/subshifts/open", { parentShiftId }).then(r => r.data),
  closeSubShift: (id) => api.patch(`/subshifts/${id}/close`).then(r => r.data),
  getOpenShifts: () => api.get("/subshifts/open-shifts").then(r => r.data),
  getActiveSubShifts: (shiftId) => api.get(`/subshifts/shift/${shiftId}`).then(r => r.data),

  // Pedidos
  createDispatch: (data) => api.post("/dispatches", data).then(r => r.data),
  getPendingDispatches: (shiftId) => api.get(`/dispatches/pending/${shiftId}`).then(r => r.data),
  getDispatchHistory: (shiftId) => api.get(`/dispatches/history/${shiftId}`).then(r => r.data),
  confirmDispatch: (id) => api.patch(`/dispatches/${id}/confirm`).then(r => r.data),
  cancelDispatch: (id) => api.patch(`/dispatches/${id}/cancel`).then(r => r.data),
}