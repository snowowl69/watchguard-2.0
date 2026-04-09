import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/client'

export default function LoginScreen() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      if (data.success) {
        setAuth(data.data.accessToken, data.data.user)
        navigate('/dashboard')
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials or server error')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await authApi.forgotPassword(forgotEmail)
      setForgotSent(true)
    } catch {
      setForgotSent(true) // Always show sent for security
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-4">
            <Shield className="w-9 h-9 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Watch Guard</h1>
          <p className="text-text-secondary text-sm mt-1">Secure Access Control</p>
        </div>

        {/* Forgot Password Modal */}
        {showForgot && (
          <Card className="mb-4 border-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reset Password</CardTitle>
              <CardDescription>
                {forgotSent
                  ? 'If an account exists with this email, a reset link has been sent.'
                  : 'Enter your email to receive a password reset link.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!forgotSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Send Reset Link</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowForgot(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => { setShowForgot(false); setForgotSent(false) }}>
                  Back to Login
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Access the security dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Admin/User Toggle */}
            <div className="flex bg-surface-light rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setIsAdmin(false)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  !isAdmin ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setIsAdmin(true)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  isAdmin ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
                }`}
              >
                Admin
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <Input
                    type="email"
                    placeholder={isAdmin ? 'admin@watchguard.app' : 'your@email.com'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>

              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-sm text-accent hover:text-accent-hover text-center"
              >
                Forgot Password?
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-[#1f2937]">
              <p className="text-xs text-text-secondary text-center">
                Demo: admin@watchguard.app / password123
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
