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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Login</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              {...register('email')}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              {...register('password')}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Need an account?{' '}
          <Link to="/register" className="text-slate-900 font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
