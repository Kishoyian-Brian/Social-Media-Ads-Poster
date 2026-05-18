import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { createPost } from '../api/posts'

interface FormValues {
  content: string
  imageUrl?: string
  scheduledAt?: string
}

export default function CreatePost() {
  const { register, handleSubmit } = useForm<FormValues>()
  const auth = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!auth.token) return
  }, [auth.token])

  const onSubmit = async (values: FormValues) => {
    if (!auth.token) return toast.error('Not authenticated')
    setSubmitting(true)
    try {
      await createPost(auth.token, values.content, values.imageUrl, values.scheduledAt)
      toast.success('Post created')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900">Create Post</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Content</label>
            <textarea
              required
              {...register('content')}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Image URL (optional)</label>
            <input
              {...register('imageUrl')}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Schedule (optional)</label>
            <input
              type="datetime-local"
              {...register('scheduledAt')}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 text-white px-5 py-3 font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create Post'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
