import api from "./api.js"
export const productsService = {
  getAll: (params) => api.get("/products", { params }).then(r => r.data),
  search: (q) => api.get("/products/search", { params: { q } }).then(r => r.data),
  getByBarcode: (code) => api.get(`/products/barcode/${code}`).then(r => r.data),
  getById: (id) => api.get(`/products/${id}`).then(r => r.data),
  create: (data) => api.post("/products", data).then(r => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  updateStock: (id, quantity) => api.patch(`/products/${id}/stock`, { quantity }).then(r => r.data),
  delete: (id) => api.delete(`/products/${id}`).then(r => r.data),
  uploadImage: (id, file) => {
    const form = new FormData()
    form.append("image", file)
    return api.post(`/products/${id}/image`, form, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data)
  },
}