import { useState } from 'react'

interface PostAuthorAvatarProps {
  profilePhoto?: string
  authorName: string
}

export function PostAuthorAvatar({ profilePhoto, authorName }: PostAuthorAvatarProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-700">
      {profilePhoto && !imgError ? (
        <img
          src={profilePhoto}
          alt={authorName}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="font-bold text-zinc-400">
            {authorName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}
