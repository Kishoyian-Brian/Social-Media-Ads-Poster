import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { disconnectTikTok, getTikTokOAuthUrl, getXOAuthUrl } from '../api/users'
import { getPosts } from '../api/posts'
import type { PostDTO } from '../api/posts'

const btnPrimary =
  'rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60'
const btnSecondary =
  'rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black disabled:opacity-60'

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

export default function Dashboard() {
  const auth = useAuth()
  const [posts, setPosts] = useState<PostDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingX, setConnectingX] = useState(false)
  const [connectingTikTok, setConnectingTikTok] = useState(false)
  const [disconnectingTikTok, setDisconnectingTikTok] = useState(false)

  useEffect(() => {
    if (!auth.token) return
    setLoading(true)
    getPosts(auth.token)
      .then((data) => setPosts(data))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [auth.token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const xConnected = params.get('x_connected')
    const tiktokConnected = params.get('tiktok_connected')

    if (xConnected === '1') {
      toast.success('X account connected.')
      auth.refresh().catch(() => {})
    } else if (xConnected === '0') {
      toast.error('Failed to connect X account.')
    }

    if (tiktokConnected === '1') {
      toast.success('TikTok account connected.')
      auth.refresh().catch(() => {})
    } else if (tiktokConnected === '0') {
      toast.error('Failed to connect TikTok account.')
    }

    if (xConnected != null || tiktokConnected != null) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [auth])

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.status === 'sent').length
    const pending = posts.filter((p) => !p.status || p.status === 'pending').length
    const connectedPlatforms =
      (auth.user?.xConnected ? 1 : 0) + (auth.user?.tiktokConnected ? 1 : 0)
    return { total: posts.length, published, pending, connectedPlatforms }
  }, [posts, auth.user?.xConnected, auth.user?.tiktokConnected])

  const handleConnectX = async () => {
    if (!auth.token) return
    setConnectingX(true)
    try {
      window.location.href = await getXOAuthUrl(auth.token)
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Failed to connect X account')
      setConnectingX(false)
    }
  }

  const handleConnectTikTok = async () => {
    if (!auth.token) return
    setConnectingTikTok(true)
    try {
      window.location.href = await getTikTokOAuthUrl(auth.token)
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Failed to connect TikTok account')
      setConnectingTikTok(false)
    }
  }

  const handleDisconnectTikTok = async () => {
    if (!auth.token) return
    setDisconnectingTikTok(true)
    try {
      await disconnectTikTok(auth.token)
      await auth.refresh()
      toast.success('TikTok disconnected')
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Failed to disconnect TikTok')
    } finally {
      setDisconnectingTikTok(false)
    }
  }

  const displayName = auth.user?.name?.trim() || auth.user?.email?.split('@')[0] || 'Creator'
  const initials = (auth.user?.name?.trim() || auth.user?.email || 'SM').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 overflow-y-auto bg-black text-left">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-neutral-800 bg-black lg:flex">
        <div className="flex items-center gap-3 border-b border-neutral-800 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-black">
            SM
          </div>
          <div>
            <p className="font-semibold text-white">Social Manager</p>
            <p className="text-xs text-slate-500">Publish everywhere</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <NavItem active icon="dashboard" label="Dashboard" />
          <NavItem icon="compose" label="Create Post" to="/posts/new" />
        </nav>

        <div className="border-t border-neutral-800 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-950 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{auth.user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={auth.logout}
            className={`mt-3 w-full ${btnPrimary}`}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-neutral-800 bg-black/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm text-slate-400">Welcome back</p>
              <h1 className="text-xl font-bold text-white sm:text-2xl">{displayName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/posts/new"
                className={`hidden sm:inline-flex ${btnPrimary} rounded-xl px-4 py-2.5`}
              >
                + New post
              </Link>
              <button
                type="button"
                onClick={auth.logout}
                className={`lg:hidden ${btnPrimary}`}
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <section className="mb-8 lg:hidden">
            <AppOverview />
          </section>

          <div className="mb-8 hidden flex-wrap items-end justify-between gap-4 lg:flex">
            <div>
              <h2 className="text-2xl font-bold text-white">Overview</h2>
              <p className="mt-1 text-slate-400">Manage platforms and track your content.</p>
            </div>
          </div>

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 lg:hidden">
            <h2 className="text-xl font-bold text-white">Quick actions</h2>
            <Link
              to="/posts/new"
              className={`inline-flex ${btnPrimary} rounded-xl px-5 py-2.5`}
            >
              + Create Post
            </Link>
          </div>

          <div className="hidden gap-4 lg:grid sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total posts" value={stats.total} hint="All content you've created" />
            <StatCard label="Published" value={stats.published} hint="Successfully sent to platforms" accent="emerald" />
            <StatCard label="Pending" value={stats.pending} hint="Waiting to publish" accent="amber" />
            <StatCard
              label="Platforms linked"
              value={stats.connectedPlatforms}
              hint="Out of 2 available"
              accent="violet"
            />
          </div>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Connected accounts</h2>
              <span className="hidden text-xs text-slate-500 lg:inline">OAuth · secure connection</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <PlatformCard
                name="X (Twitter)"
                description="Share text and images to your timeline"
                connected={auth.user?.xConnected ?? false}
                icon={<XIcon className="h-5 w-5" />}
                iconBg="bg-black text-white"
                connecting={connectingX}
                onConnect={handleConnectX}
              />
              <PlatformCard
                name="TikTok"
                description="Publish photo posts to your profile"
                connected={auth.user?.tiktokConnected ?? false}
                icon={<TikTokIcon className="h-5 w-5" />}
                iconBg="bg-gradient-to-br from-[#25F4EE] via-black to-[#FE2C55] text-white"
                connecting={connectingTikTok}
                onConnect={handleConnectTikTok}
                onDisconnect={auth.user?.tiktokConnected ? handleDisconnectTikTok : undefined}
                disconnecting={disconnectingTikTok}
              />
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Content feed</h2>
                <p className="mt-1 hidden text-sm text-slate-400 lg:block">Recent posts and publish status</p>
                <p className="mt-1 text-sm text-slate-400 lg:hidden">Your recent posts</p>
              </div>
              <Link
                to="/posts/new"
                className={`hidden lg:inline-flex ${btnPrimary}`}
              >
                New post
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                    <div className="h-4 w-32 rounded bg-neutral-900" />
                    <div className="mt-3 h-4 w-full rounded bg-neutral-900" />
                    <div className="mt-2 h-4 w-2/3 rounded bg-neutral-900" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyFeed />
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} displayName={displayName} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function NavItem({
  icon,
  label,
  to,
  active,
}: {
  icon: 'dashboard' | 'compose'
  label: string
  to?: string
  active?: boolean
}) {
  const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    active
      ? 'bg-white/10 text-white'
      : 'text-neutral-400 hover:bg-neutral-950 hover:text-white'
  }`

  const content = (
    <>
      {icon === 'dashboard' ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      )}
      {label}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <span className={className} aria-current={active ? 'page' : undefined}>
      {content}
    </span>
  )
}

function StatCard({
  label,
  value,
  hint,
  accent = 'slate',
}: {
  label: string
  value: number
  hint: string
  accent?: 'slate' | 'emerald' | 'amber' | 'violet'
}) {
  const accentClasses = {
    slate: 'text-white',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    violet: 'text-white',
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accentClasses[accent]}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  )
}

function PlatformCard({
  name,
  description,
  connected,
  icon,
  iconBg,
  connecting,
  onConnect,
  onDisconnect,
  disconnecting,
}: {
  name: string
  description: string
  connected: boolean
  icon: ReactNode
  iconBg: string
  connecting: boolean
  onConnect: () => void
  onDisconnect?: () => void
  disconnecting?: boolean
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 transition hover:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
          <div>
            <h3 className="font-semibold text-white">{name}</h3>
            <p className="mt-0.5 text-sm text-slate-400">{description}</p>
          </div>
        </div>
        <StatusPill connected={connected} className="hidden lg:inline-flex" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
          className={btnPrimary}
        >
          {connecting ? 'Connecting…' : connected ? 'Reconnect' : 'Connect'}
        </button>
        {onDisconnect ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnecting}
            className={btnSecondary}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function StatusPill({ connected, className = '' }: { connected: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        connected
          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
          : 'bg-neutral-900 text-slate-400 ring-1 ring-slate-700'
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
      {connected ? 'Connected' : 'Not linked'}
    </span>
  )
}

function PostCard({ post, displayName }: { post: PostDTO; displayName: string }) {
  const initials = displayName.slice(0, 2).toUpperCase()
  const status = post.status ?? 'pending'
  const platformResults = post.platformResults ?? {}

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 transition hover:border-neutral-700">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-white">{displayName}</span>
              <span className="text-sm text-slate-500">·</span>
              <time className="text-sm text-slate-500" dateTime={post.createdAt}>
                {formatRelativeTime(post.createdAt)}
              </time>
              <PostStatusBadge status={status} className="hidden lg:inline-flex" />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">{post.content}</p>
            {post.imageUrl ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
                <img src={post.imageUrl} alt="" className="max-h-72 w-full object-cover" />
              </div>
            ) : null}
            {post.failReason ? (
              <p className="mt-3 hidden rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 lg:block">
                {post.failReason}
              </p>
            ) : null}
            <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
              <PlatformResultChip platform="x" result={platformResults.x} />
              <PlatformResultChip platform="tiktok" result={platformResults.tiktok} />
            </div>
          </div>
        </div>
      </div>
      <footer className="hidden flex-wrap items-center justify-between gap-2 border-t border-neutral-800 bg-black/40 px-5 py-3 text-xs text-slate-500 lg:flex">
        <span>Created {new Date(post.createdAt).toLocaleString()}</span>
        {post.publishedAt ? <span>Published {new Date(post.publishedAt).toLocaleString()}</span> : null}
      </footer>
    </article>
  )
}

function PostStatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const styles: Record<string, string> = {
    sent: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    failed: 'bg-red-500/10 text-red-400 ring-red-500/20',
    scheduled: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  }

  const labels: Record<string, string> = {
    sent: 'Published',
    pending: 'Pending',
    failed: 'Failed',
    scheduled: 'Scheduled',
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles[status] ?? styles.pending} ${className}`}
    >
      {labels[status] ?? status}
    </span>
  )
}

function PlatformResultChip({ platform, result }: { platform: 'x' | 'tiktok'; result?: string }) {
  if (!result) return null

  const label = platform === 'x' ? 'X' : 'TikTok'
  const isSent = result === 'sent'
  const isSkipped = result.startsWith('skipped')
  const isFailed = result.startsWith('failed')

  const style = isSent
    ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
    : isFailed
      ? 'bg-red-500/10 text-red-400 ring-red-500/20'
      : 'bg-neutral-900 text-slate-400 ring-slate-700'

  const statusLabel = isSent
    ? 'Sent'
    : isSkipped
      ? result.replace('skipped:', '').replace(/_/g, ' ')
      : isFailed
        ? 'Failed'
        : result

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style}`}>
      {platform === 'x' ? <XIcon className="h-3 w-3" /> : <TikTokIcon className="h-3 w-3" />}
      {label}: {statusLabel}
    </span>
  )
}

function AppOverview() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h2 className="text-lg font-bold text-white">About this app</h2>

      <p className="mt-3 text-sm leading-relaxed text-neutral-300">
        Social Manager is a simple tool for creators and small businesses to write social posts once and
        publish them to X (Twitter) and TikTok from a single dashboard. Connect your accounts securely, then
        manage your content without jumping between different apps.
      </p>

      <p className="mt-3 text-sm leading-relaxed text-neutral-400">
        To get started, link your X and TikTok accounts in the section below, then tap Create Post to write
        your message and add an optional image. When you publish, the post is sent to every platform you have
        connected. Your recent posts appear in the feed further down the page.
      </p>
    </div>
  )
}

function EmptyFeed() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950 px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">No posts yet</h3>
      <p className="mt-2 text-sm text-slate-400">Create your first post and publish to X and TikTok.</p>
      <Link
        to="/posts/new"
        className={`mt-6 inline-flex items-center gap-2 ${btnPrimary} rounded-xl px-5 py-2.5`}
      >
        Create your first post
      </Link>
    </div>
  )
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
