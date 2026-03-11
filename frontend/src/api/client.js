import axios from 'axios'

const BACKEND = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${BACKEND}/api`,
  timeout: 90000
})

api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('sdr_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('sdr_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
