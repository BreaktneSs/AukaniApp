import api from "./api.js"

export const auditService = {
  getAll: (params) => api.get("/audit/logs", { params }).then(r => r.data),
}
