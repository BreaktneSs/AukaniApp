import api from "./api.js"
export const usersService = {
  getAll: (params) => api.get("/users", { params }).then(r => r.data),
  getById: (id) => api.get(`/users/${id}`).then(r => r.data),
  create: (data) => api.post("/users", data).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  changePassword: (id, password) => api.patch(`/users/${id}/password`, { password }).then(r => r.data),
  deactivate: (id) => api.delete(`/users/${id}`).then(r => r.data),
  reactivate: (id) => api.patch(`/users/${id}/reactivate`).then(r => r.data),
  changeOwnPassword: (currentPassword, newPassword) => api.patch("/profile/password", { currentPassword, newPassword }).then(r => r.data),
}