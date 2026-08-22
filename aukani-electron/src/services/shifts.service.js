import api from "./api.js"
export const shiftsService = {
  open: (openingCash) => api.post("/shifts/open", { openingCash }).then(r => r.data),
  close: (id, data) => api.patch(`/shifts/${id}/close`, data).then(r => r.data),
  getActive: () => api.get("/shifts/active").then(r => r.data),
  getMine: () => api.get("/shifts/mine").then(r => r.data),
  getAll: (params) => api.get("/shifts", { params }).then(r => r.data),
  getById: (id) => api.get(`/shifts/${id}`).then(r => r.data),
}