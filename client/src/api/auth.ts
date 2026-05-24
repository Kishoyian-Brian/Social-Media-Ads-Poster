import axios from 'axios'

export interface UserDTO {
  id: string
  name: string
  email: string
  xConnected: boolean
  tiktokConnected: boolean
}

export interface AuthResponse {
  token: string
  user: UserDTO
}

export interface RegisterOtpResponse {
  message: string
  email: string
  otpSent: boolean
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export function login(email: string, password: string) {
  return api.post<AuthResponse>('/auth/login', { email, password }).then((response) => response.data)
}

export function requestRegister(name: string, email: string, password: string) {
  return api
    .post<RegisterOtpResponse>('/auth/register', { name, email, password })
    .then((response) => response.data)
}

export function verifyRegister(email: string, code: string) {
  return api
    .post<AuthResponse>('/auth/verify-register', { email, code })
    .then((response) => response.data)
}

export function getMe(token: string) {
  return api
    .get<{ user: UserDTO }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => response.data.user)
}
