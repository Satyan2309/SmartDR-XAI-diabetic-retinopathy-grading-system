import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 90000 })

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
