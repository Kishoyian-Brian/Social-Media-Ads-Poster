import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { register as apiRegister } from '../api/auth'

interface RegisterFormValues {
  name: string
  email: string
  password: string
}

const inputClass =
  'mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none'

export default function Register() {
  const { register, handleSubmit } = useForm<RegisterFormValues>()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true)
    try {
      await apiRegister(values.name, values.email, values.password)
      toast.success('Account created — please sign in')
      navigate('/login', { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Registration failed')
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

        <h1 className="text-3xl font-bold text-white">Create account</h1>
        <p className="mt-2 text-sm text-neutral-400">Sign up, then log in to access your dashboard.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Full name</span>
            <input
              type="text"
              autoComplete="name"
              required
              {...register('name', { minLength: 2 })}
              className={inputClass}
              placeholder="Jane Doe"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              {...register('email')}
              className={inputClass}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-300">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              {...register('password', { minLength: 6 })}
              className={inputClass}
              placeholder="At least 6 characters"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
