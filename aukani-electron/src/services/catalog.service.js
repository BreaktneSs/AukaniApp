import api from "./api.js"
export const categoriesService = {
  getAll: () => api.get("/categories").then(r => r.data),
  create: (name) => api.post("/categories", { name }).then(r => r.data),
  update: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/categories/${id}`).then(r => r.data),
}
export const paymentMethodsService = {
  getAll: () => api.get("/payment-methods").then(r => r.data),
  create: (name) => api.post("/payment-methods", { name }).then(r => r.data),
  update: (id, data) => api.put(`/payment-methods/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/payment-methods/${id}`).then(r => r.data),
}