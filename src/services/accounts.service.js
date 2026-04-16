import api from "./api.js"

export const accountsService = {
  create: (shiftId, name) => api.post("/accounts", { shiftId, name }).then(r => r.data),
  getByShift: (shiftId) => api.get(`/accounts/shift/${shiftId}`).then(r => r.data),
  close: (id) => api.patch(`/accounts/${id}/close`).then(r => r.data),
  removeItem: (accountId, itemId) => api.delete(`/accounts/${accountId}/items/${itemId}`).then(r => r.data),
}
