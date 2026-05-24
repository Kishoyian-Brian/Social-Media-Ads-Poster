import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { requestRegister, verifyRegister } from '../api/auth'
import { useAuth } from '../context/AuthContext'

interface RegisterFormValues {
  name: string
  email: string
  password: string
}

const inputClass =
  'mt-2 w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none'

export default function Register() {
  const { register, handleSubmit, getValues } = useForm<RegisterFormValues>()
  const navigate = useNavigate()
  const auth = useAuth()
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmitDetails = async (values: RegisterFormValues) => {
    setSubmitting(true)
    try {
      const result = await requestRegister(values.name, values.email, values.password)
      setEmail(result.email)
      setStep('otp')
      toast.success('Verification code sent to your email')
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  const onVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    if (otp.length !== 6) {
      return toast.error('Enter the 6-digit code from your email')
    }

    setSubmitting(true)
    try {
      const response = await verifyRegister(email, otp)
      auth.establishSession(response.token, response.user)
      toast.success('Account created successfully')
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const onResendOtp = async () => {
    const values = getValues()
    if (!values.name || !values.email || !values.password) {
      return toast.error('Go back and fill in your details again')
    }

    setSubmitting(true)
    try {
      await requestRegister(values.name, values.email, values.password)
      toast.success('New verification code sent')
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Could not resend code')
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

        {step === 'details' ? (
          <>
            <h1 className="text-3xl font-bold text-white">Create account</h1>
            <p className="mt-2 text-sm text-neutral-400">Enter your details. We will email you a verification code.</p>

            <form onSubmit={handleSubmit(onSubmitDetails)} className="mt-8 space-y-5">
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
                {submitting ? 'Sending code...' : 'Continue'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white">Verify email</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Enter the 6-digit code sent to <span className="text-white">{email}</span>
            </p>

            <form onSubmit={onVerifyOtp} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-neutral-300">Verification code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                  placeholder="000000"
                />
              </label>

              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
              >
                {submitting ? 'Verifying...' : 'Create account'}
              </button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-neutral-400 transition hover:text-white"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={submitting}
                  className="font-medium text-white transition hover:underline disabled:opacity-60"
                >
                  Resend code
                </button>
              </div>
            </form>
          </>
        )}

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
