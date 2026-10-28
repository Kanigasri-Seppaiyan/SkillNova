/// <reference types="vite/client" />
import axios from 'axios'

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('skillnova_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Keep interceptor simple without forced hard reload loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  }
)

export default api
