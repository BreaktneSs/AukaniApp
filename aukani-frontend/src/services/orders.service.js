import api from "./api.js"
export const ordersService = {
  createSale: (data) => api.post("/sale", data).then(r => r.data),
  getAll: (params) => api.get("/orders", { params }).then(r => r.data),
  getById: (id) => api.get(`/orders/${id}`).then(r => r.data),
  cancel: (id) => api.patch(`/orders/${id}/cancel`).then(r => r.data),
  getDailySummary: () => api.get("/orders/summary/daily").then(r => r.data),
  getAccounting: (params) => api.get("/orders/accounting", { params }).then(r => r.data),
}