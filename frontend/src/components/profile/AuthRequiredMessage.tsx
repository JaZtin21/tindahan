import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function AuthRequiredMessage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/login')
  }, [navigate])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-zinc-400">Redirecting to login...</p>
    </div>
  )
}
