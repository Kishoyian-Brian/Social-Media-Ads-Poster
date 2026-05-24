import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { createPost } from '../api/posts'

interface FormValues {
  content: string
  imageUrl?: string
  scheduledAt?: string
}

const inputClass =
  'mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none'

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

function PlatformStatus({
  name,
  icon,
  iconBg,
  connected,
}: {
  name: string
  icon: ReactNode
  iconBg: string
  connected: boolean
}) {
  return (
    <div
      className={`flex min-w-[9.5rem] items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        connected
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-neutral-800 bg-neutral-950'
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className={`text-xs ${connected ? 'text-emerald-400' : 'text-neutral-500'}`}>
          {connected ? 'Connected' : 'Not linked'}
        </p>
      </div>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-emerald-400' : 'bg-neutral-600'}`}
        aria-hidden="true"
      />
    </div>
  )
}

export default function CreatePost() {
  const { register, handleSubmit } = useForm<FormValues>()
  const auth = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

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
    <div className="fixed inset-0 overflow-y-auto bg-black text-left">
      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-black/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Back
              </Link>
              <div className="h-8 w-px bg-neutral-800" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Compose</p>
                <h1 className="text-lg font-bold text-white sm:text-xl">Create Post</h1>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Publish to</p>
              <div className="flex flex-wrap gap-2">
                <PlatformStatus
                  name="X"
                  connected={auth.user?.xConnected ?? false}
                  icon={<XIcon className="h-4 w-4" />}
                  iconBg="bg-white text-black"
                />
                <PlatformStatus
                  name="TikTok"
                  connected={auth.user?.tiktokConnected ?? false}
                  icon={<TikTokIcon className="h-4 w-4" />}
                  iconBg="bg-gradient-to-br from-[#25F4EE] via-black to-[#FE2C55] text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
          <p className="text-sm text-neutral-400">
            Write your post below. It will publish to connected platforms when you submit.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-neutral-300">Content</span>
              <textarea
                required
                rows={5}
                placeholder="What's on your mind?"
                {...register('content')}
                className={`${inputClass} min-h-[120px] resize-y`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">Image URL</span>
              <span className="ml-2 text-xs text-neutral-500">Required for TikTok</span>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                {...register('imageUrl')}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">Schedule (optional)</span>
              <input type="datetime-local" {...register('scheduledAt')} className={`${inputClass} [color-scheme:dark]`} />
            </label>

            <div className="rounded-xl border border-neutral-800 bg-black p-4 text-sm text-neutral-400">
              <p className="font-medium text-neutral-300">Publishing notes</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>X: text posts work; images are included when you add a URL.</li>
                <li>TikTok: requires a public HTTPS image URL.</li>
                <li>Connect accounts on the dashboard before publishing.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
              >
                {submitting ? 'Publishing...' : 'Create & publish'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-xl border border-white/25 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-black"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
