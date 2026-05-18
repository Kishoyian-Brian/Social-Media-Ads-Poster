import axios from 'axios'

export interface PostDTO {
  id: string
  content: string
  imageUrl?: string | null
  scheduledAt?: string | null
  createdAt: string
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
})

export function createPost(token: string, content: string, imageUrl?: string, scheduledAt?: string) {
  return api
    .post<PostDTO>(
      '/posts',
      { content, imageUrl: imageUrl || undefined, scheduledAt: scheduledAt || undefined },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    .then((r) => r.data)
}

export function getPosts(token: string) {
  return api.get<PostDTO[]>('/posts', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data)
}
