import api from "./api.js"

export const purchasesService = {
  create:       (body)             => api.post("/purchases", body).then(r => r.data),
  createReturn: (purchaseId, body) => api.post(`/purchases/${purchaseId}/returns`, body).then(r => r.data),
  getAll:       (params)           => api.get("/purchases", { params }).then(r => r.data),
}
