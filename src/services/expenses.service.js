import api from "./api.js"
export const expensesService = {
  create: (data) => api.post("/expenses", data).then(r => r.data),
  getByShift: (shiftId) => api.get(`/expenses/shift/${shiftId}`).then(r => r.data),
  delete: (id) => api.delete(`/expenses/${id}`).then(r => r.data),
}
