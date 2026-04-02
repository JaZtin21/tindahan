import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { GoogleLogin } from '@react-oauth/google'
import { GOOGLE_LOGIN_MUTATION } from '../api/graphql/auth/auth-queries'
import type { GoogleLoginResponse } from '../api/graphql/auth/auth-queries'

export function SignupPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'CUSTOMER' | 'OWNER'>('CUSTOMER')
  const [error, setError] = useState('')

  const [googleLogin, { loading }] = useMutation<GoogleLoginResponse>(GOOGLE_LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data?.googleLogin?.success && data?.googleLogin?.data) {
        localStorage.setItem('access_token', data.googleLogin.data.accessToken)
        localStorage.setItem('refresh_token', data.googleLogin.data.refreshToken)
        navigate('/')
      } else {
        setError(data?.googleLogin?.message || 'Signup failed')
      }
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  const handleGoogleSuccess = (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('No credential received from Google')
      return
    }

    googleLogin({
      variables: {
        input: {
          credential: credentialResponse.credential,
          role,
        },
      },
    })
  }

  const handleGoogleError = () => {
    setError('Google signup failed or was cancelled')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-zinc-900 dark:text-zinc-100">
          Create Account
        </h1>

        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6">
          Sign up with your Google account
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
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

          <div className="flex justify-center pt-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>
        </div>

        {loading && (
          <p className="mt-4 text-center text-sm text-zinc-500">
            Creating account...
          </p>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
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
