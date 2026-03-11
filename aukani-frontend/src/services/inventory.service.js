import api from "./api.js"
export const inventoryService = {
  entry: (data) => api.post("/inventory/entry", data).then(r => r.data),
  exit: (data) => api.post("/inventory/exit", data).then(r => r.data),
  getMovements: (params) => api.get("/inventory/movements", { params }).then(r => r.data),
  getLowStock: () => api.get("/inventory/low-stock").then(r => r.data),
}