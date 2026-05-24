import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getXOAuthUrl(token: string) {
  return api
    .get<{ url: string }>('/users/x/oauth-url', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => response.data.url)
}

export function getTikTokOAuthUrl(token: string) {
  return api
    .get<{ url: string }>('/users/tiktok/oauth-url', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => response.data.url)
}

export function disconnectTikTok(token: string) {
  return api
    .delete('/users/tiktok/connection', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((r) => r.data)
}
