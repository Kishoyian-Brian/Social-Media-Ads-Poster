import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getXOAuthUrl } from '../api/users'
import { getPosts } from '../api/posts'
import type { PostDTO } from '../api/posts'

export default function Dashboard() {
  const auth = useAuth()
  const [posts, setPosts] = useState<PostDTO[]>([])
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!auth.token) return

    getPosts(auth.token)
      .then((data) => setPosts(data))
      .catch(() => setPosts([]))
  }, [auth.token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === '1') {
      toast.success('X account connected successfully.')
      params.delete('connected')
      window.history.replaceState({}, '', window.location.pathname)
      auth.refresh().catch(() => {})
    }
  }, [auth])

  const handleConnectX = async () => {
    if (!auth.token) return

    setConnecting(true)
    try {
      const url = await getXOAuthUrl(auth.token)
      window.location.href = url
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Failed to connect X account')
      setConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">Manage your account and create posts from here.</p>
          </div>
          <button
            type="button"
            onClick={auth.logout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <section className="mt-10 grid gap-8 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
            <p className="mt-3 text-slate-700">Email: {auth.user?.email}</p>
            <p className="mt-1 text-slate-500">User ID: {auth.user?.id}</p>
            <p className="mt-1 text-slate-500">X connection: {auth.user?.xConnected ? 'Connected' : 'Not connected'}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Connect X</h2>
            <p className="mt-3 text-slate-700">
              Connect your X account through OAuth so posts publish from your own account.
            </p>
            <button
              type="button"
              onClick={handleConnectX}
              disabled={connecting}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-3 font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {connecting ? 'Connecting...' : auth.user?.xConnected ? 'Reconnect X' : 'Connect X'}
            </button>
          </div>
        </section>

        <section className="mt-10 grid gap-8 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Next step</h2>
            <p className="mt-3 text-slate-700">Build the post creation flow and connect your frontend to the backend.</p>
            <div className="mt-4">
              <Link
                to="/posts/new"
                className="inline-block rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
              >
                Create Post
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Your posts</h2>
          <div className="mt-4 space-y-4">
            {posts.length === 0 ? (
              <p className="text-slate-600">You have no posts yet.</p>
            ) : (
              posts.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-slate-800">{p.content}</p>
                  {p.imageUrl ? <img src={p.imageUrl} alt="post" className="mt-2 max-h-40 object-contain" /> : null}
                  <p className="mt-2 text-sm text-slate-500">Created: {new Date(p.createdAt).toLocaleString()}</p>
                  {p.scheduledAt ? (
                    <p className="text-sm text-slate-500">Scheduled: {new Date(p.scheduledAt).toLocaleString()}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
