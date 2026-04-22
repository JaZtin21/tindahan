import { Loader2 } from 'lucide-react'

interface ProfileLoadingStateProps {
  message?: string
}

export function ProfileLoadingState({ message = 'Loading...' }: ProfileLoadingStateProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <span className="ml-3 text-zinc-400">{message}</span>
    </div>
  )
}
