import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { LOGIN_MUTATION } from '../api/graphql'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data: { login: { success: boolean; message: string; data: { accessToken: string; refreshToken: string } } }) => {
      if (data.login.success) {
        // Store tokens
        localStorage.setItem('access_token', data.login.data.accessToken)
        localStorage.setItem('refresh_token', data.login.data.refreshToken)
        // Redirect to home
        navigate('/')
      } else {
        setError(data.login.message)
      }
    },
    onError: (error: { message: string }) => {
      setError(error.message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    await login({
      variables: {
        input: { email, password },
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-zinc-900 dark:text-zinc-100">
          Login to Tindahan
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No account yet?{' '}
          <Link
            to="/signup"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  )
}
