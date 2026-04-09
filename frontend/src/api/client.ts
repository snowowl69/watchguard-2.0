import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — try token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
        if (data.success && data.data?.accessToken) {
          useAuthStore.getState().setToken(data.data.accessToken)
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`
          return api(originalRequest)
        }
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  refresh: () =>
    api.post('/auth/refresh'),
  logout: () =>
    api.post('/auth/logout'),
  me: () =>
    api.get('/auth/me'),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
}

// ─── Face API ────────────────────────────────────────────
export const faceApi = {
  recognize: (formData: FormData) =>
    api.post('/face/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  recognizeBase64: (image_base64: string, cameraId?: string) =>
    api.post('/face/recognize', { image_base64, cameraId }),
  register: (formData: FormData) =>
    api.post('/face/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getEmbedding: (userId: string) =>
    api.get(`/face/embedding/${userId}`),
}

// ─── Users API ───────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string>) =>
    api.get('/users', { params }),
  get: (id: string) =>
    api.get(`/users/${id}`),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/users/${id}`, data),
  delete: (id: string) =>
    api.delete(`/users/${id}`),
}

// ─── Attendance API ──────────────────────────────────────
export const attendanceApi = {
  list: (params?: Record<string, string>) =>
    api.get('/attendance', { params }),
  stats: () =>
    api.get('/attendance/stats'),
  export: (params?: Record<string, string>) =>
    api.get('/attendance/export', { params, responseType: 'blob' }),
  history: (userId: string, params?: Record<string, string>) =>
    api.get(`/attendance/${userId}/history`, { params }),
}

// ─── Approvals API ───────────────────────────────────────
export const approvalsApi = {
  list: () =>
    api.get('/approvals'),
  approve: (id: string) =>
    api.post(`/approvals/${id}/approve`),
  reject: (id: string) =>
    api.post(`/approvals/${id}/reject`),
}

// ─── Cameras API ─────────────────────────────────────────
export const camerasApi = {
  list: () =>
    api.get('/cameras'),
  create: (data: Record<string, any>) =>
    api.post('/cameras', data),
  update: (id: string, data: Record<string, any>) =>
    api.put(`/cameras/${id}`, data),
}

// ─── Notifications API ───────────────────────────────────
export const notificationsApi = {
  list: () =>
    api.get('/notifications'),
  markRead: (id: string) =>
    api.put(`/notifications/${id}/read`),
  markAllRead: () =>
    api.put('/notifications/read-all'),
}
