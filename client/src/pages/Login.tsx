import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

interface LoginFormValues {
  email: string
  password: string
}

export default function Login() {
  const { register, handleSubmit } = useForm<LoginFormValues>()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true)
    try {
      await auth.login(values.email, values.password)
      toast.success('Logged in successfully')
      navigate(from, { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black px-4 text-left">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-black">
            SM
          </div>
          <div>
            <p className="font-semibold text-white">Social Manager</p>
            <p className="text-xs text-neutral-500">Publish everywhere</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-neutral-400">Welcome back. Log in to manage your posts.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              {...register('email')}
              className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              {...register('password')}
              className="mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-400">
          Need an account?{' '}
          <Link to="/register" className="font-semibold text-white hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
