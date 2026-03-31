import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { SIGNUP_MUTATION } from '../api/graphql'

export function SignupPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'CUSTOMER' | 'OWNER'>('CUSTOMER')
  const [error, setError] = useState('')

  const [signup, { loading }] = useMutation(SIGNUP_MUTATION, {
    onCompleted: (data: { signup: { success: boolean; message: string; data: { accessToken: string; refreshToken: string } } }) => {
      if (data.signup.success) {
        // Store tokens
        localStorage.setItem('access_token', data.signup.data.accessToken)
        localStorage.setItem('refresh_token', data.signup.data.refreshToken)
        // Redirect to home
        navigate('/')
      } else {
        setError(data.signup.message)
      }
    },
    onError: (error: { message: string }) => {
      setError(error.message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    await signup({
      variables: {
        input: { firstName, lastName, email, password, role },
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-zinc-900 dark:text-zinc-100">
          Create Account
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
              placeholder="John"
              required
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
              placeholder="Doe"
              required
            />
          </div>

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
              htmlFor="role"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Account Type
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'CUSTOMER' | 'OWNER')}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="OWNER">Store Owner</option>
            </select>
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}
