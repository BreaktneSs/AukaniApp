import api from "./api.js"
export const reservationsService = {
  create:   (data)         => api.post("/reservations", data).then(r => r.data),
  getAll:   (params)       => api.get("/reservations", { params }).then(r => r.data),
  getById:  (id)           => api.get(`/reservations/${id}`).then(r => r.data),
  complete: (id, data)     => api.patch(`/reservations/${id}/complete`, data).then(r => r.data),
  cancel:   (id, data)     => api.patch(`/reservations/${id}/cancel`, data).then(r => r.data),
}
