import axios from 'axios'

export interface UserDTO {
  id: string
  email: string
  xConnected: boolean
}

export interface AuthResponse {
  token: string
  user: UserDTO
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

export function register(email: string, password: string) {
  return api.post<AuthResponse>('/auth/register', { email, password }).then((response) => response.data)
}

export function getMe(token: string) {
  return api
    .get<{ user: UserDTO }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => response.data.user)
}
