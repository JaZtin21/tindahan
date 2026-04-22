import { useRef, type ChangeEvent } from 'react'
import { Camera, Loader2, ImageIcon } from 'lucide-react'
import type { User } from '../../types'

interface CoverPhotoSectionProps {
  profile: User | undefined
  coverImgError: boolean
  setCoverImgError: (value: boolean) => void
  uploadingCover: boolean
  onCoverPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function CoverPhotoSection({
  profile,
  coverImgError,
  setCoverImgError,
  uploadingCover,
  onCoverPhotoChange,
}: CoverPhotoSectionProps) {
  const coverPhotoRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-b-2xl bg-zinc-800 sm:h-80 lg:h-96">
      {profile?.coverPhoto && !coverImgError ? (
        <img
          src={profile.coverPhoto}
          alt="Cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={() => setCoverImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
          <ImageIcon className="h-16 w-16 text-zinc-600" />
        </div>
      )}

      <button
        onClick={() => coverPhotoRef.current?.click()}
        disabled={uploadingCover}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-50"
      >
        {uploadingCover ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        Change Cover
      </button>
      <input
        ref={coverPhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onCoverPhotoChange}
      />
    </div>
  )
}
