import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../api/graphql/apolloProviderWithAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { handleGoogleCredential, onLoginSuccess, isAuthenticated, isLoading } = useAuth()

  // Set up navigation callback when login succeeds
  useEffect(() => {
    onLoginSuccess(() => {
      navigate('/')
    })
  }, [navigate, onLoginSuccess])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/')
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleGoogleSuccess = (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      return
    }
    // Pass credential to auth context
    handleGoogleCredential(credentialResponse.credential)
  }

  const handleGoogleError = () => {
    console.error('Google login failed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-zinc-900 dark:text-zinc-100">
          Login to Tindahan
        </h1>

        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6">
          Sign in with your Google account to continue
        </p>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </div>
      </div>
    </div>
  )
}
