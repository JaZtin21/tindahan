import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { GoogleLogin } from '@react-oauth/google'
import { GOOGLE_LOGIN_MUTATION } from '../api/graphql/auth/auth-queries'
import type { GoogleLoginResponse } from '../api/graphql/auth/auth-queries'

export function LoginPage() {
  const navigate = useNavigate()

  const [googleLogin, { loading }] = useMutation<GoogleLoginResponse>(GOOGLE_LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data?.googleLogin?.success && data?.googleLogin?.data) {
        localStorage.setItem('access_token', data.googleLogin.data.accessToken)
        localStorage.setItem('refresh_token', data.googleLogin.data.refreshToken)
        navigate('/')
      } 
    },
    onError: (error) => {
    },
  })

  const handleGoogleSuccess = (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      return
    }

    googleLogin({
      variables: {
        input: {
          credential: credentialResponse.credential,
        },
      },
    })
  }

  const handleGoogleError = () => {
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

        {loading && (
          <p className="mt-4 text-center text-sm text-zinc-500">
            Logging in...
          </p>
        )}
      </div>
    </div>
  )
}
