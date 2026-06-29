import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff } from '@untitledui/icons'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async ({ username, password }) => {
    try {
      await login(username, password)
      toast.success('Welcome back')
      navigate('/')
    } catch {
      // handled by interceptor
    }
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <img src="/favicon.png" alt="Logo" className="w-14 h-14 mx-auto mb-4 rounded-lg shadow-lg" />
          <h1 className="text-xl font-semibold text-white tracking-tight">Shreeji Facility Services</h1>
          <p className="text-brand-400 text-sm mt-1">Employee Management System</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl p-7 shadow-xl shadow-black/20">
          <h2 className="text-base font-semibold text-brand-900 mb-5">Sign in</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                {...register('username', { required: 'Username is required' })}
                className="input"
                placeholder="Enter username"
                autoComplete="username"
              />
              {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-700 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5 mt-2">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-brand-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} Shreeji Facility Services. All rights reserved.
        </p>
      </div>
    </div>
  )
}
