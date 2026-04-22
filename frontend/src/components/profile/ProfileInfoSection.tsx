import { useRef, useState } from 'react'
import { Camera, MapPin, Calendar, Edit3, Loader2 } from 'lucide-react'
import type { ProfileInfoSectionProps } from '../../types/profile'
import { formatDate } from '../../utils/profile'

export function ProfileInfoSection({
  profile,
  uploadingProfile,
  postsCount,
  onProfilePhotoChange,
  onEditClick,
}: ProfileInfoSectionProps) {
  const profilePhotoRef = useRef<HTMLInputElement>(null)
  const [profileImgError, setProfileImgError] = useState(false)

  return (
    <div className="relative px-4 sm:px-6">
      <div className="relative -mt-16 mb-4 flex items-end justify-between sm:-mt-20">
        <div className="relative">
          <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800 sm:h-40 sm:w-40">
            {profile?.profilePhoto && !profileImgError ? (
              <img
                src={profile.profilePhoto}
                alt={profile.name}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={() => setProfileImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-300 dark:bg-zinc-700">
                <span className="text-4xl font-bold text-zinc-400 sm:text-5xl">
                  {profile?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => profilePhotoRef.current?.click()}
            disabled={uploadingProfile}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-600 dark:bg-zinc-700 text-zinc-200 dark:text-zinc-300 transition-colors hover:bg-zinc-500 dark:hover:bg-zinc-600 disabled:opacity-50"
          >
            {uploadingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input
            ref={profilePhotoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onProfilePhotoChange}
          />
        </div>

        <button
          onClick={onEditClick}
          className="flex items-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-100 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700"
        >
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
            {profile?.name || 'User'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{profile?.email}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          {profile?.phone && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{profile.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>Joined {profile?.createdAt ? formatDate(profile.createdAt) : 'Recently'}</span>
          </div>
        </div>

        <div className="flex gap-6 border-y border-zinc-200 dark:border-zinc-800 py-3">
          <div className="text-center">
            <span className="block font-bold text-zinc-900 dark:text-white">{postsCount}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-500">Posts</span>
          </div>
          <div className="text-center">
            <span className="block font-bold text-zinc-900 dark:text-white">{profile?.followers?.length || 0}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-500">Followers</span>
          </div>
          <div className="text-center">
            <span className="block font-bold text-zinc-900 dark:text-white">{profile?.following?.length || 0}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-500">Following</span>
          </div>
          <div className="text-center">
            <span className="block font-bold text-zinc-900 dark:text-white">{profile?.shops?.length || 0}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-500">Shops</span>
          </div>
        </div>
      </div>
    </div>
  )
}
