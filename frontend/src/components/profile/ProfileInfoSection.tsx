import { useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, Calendar, Edit3, Loader2, UserPlus, UserMinus, X } from 'lucide-react'
import type { ProfileInfoSectionProps } from '../../types/profile'
import type { RootState } from '../../store'
import { formatDate } from '../../utils/profile'
import { useQuery } from '@apollo/client/react'
import { GET_USERS_BY_IDS } from '../../api/graphql/user/user-queries'
import { Modal } from '../common/Modal'

export function ProfileInfoSection({
  profile,
  uploadingProfile,
  postsCount,
  onProfilePhotoChange,
  onEditClick,
  isViewOnly = false,
  onFollow,
  onUnfollow,
  followLoading = false,
}: ProfileInfoSectionProps) {
  const currentUser = useSelector((state: RootState) => state.user)
  const navigate = useNavigate()
  const profilePhotoRef = useRef<HTMLInputElement>(null)
  const [profileImgError, setProfileImgError] = useState(false)

  // Modal state for followers/following
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null)

  // Check if current user is in the followers array
  const currentUserId = currentUser?.id || ''
  const followers = profile?.followers || []
  const isFollowing = followers.includes(currentUserId)

  // Derive counts from arrays
  const followersCount = profile?.followers?.length || 0
  const followingCount = profile?.following?.length || 0

  // Fetch user details for followers/following
  const userIdsToFetch = modalType === 'followers' ? followers : (modalType === 'following' ? profile?.following || [] : [])
  const { data: usersData, loading: usersLoading } = useQuery(
    GET_USERS_BY_IDS,
    {
      variables: { ids: userIdsToFetch },
      skip: !modalType || userIdsToFetch.length === 0,
      fetchPolicy: 'cache-and-network',
    }
  )

  const users = usersData?.usersByIds || []

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`)
    setModalType(null)
  }

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

          {!isViewOnly && (
            <>
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
            </>
          )}
        </div>

        {isViewOnly ? (
          <button
            onClick={isFollowing ? onUnfollow : onFollow}
            disabled={followLoading}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isFollowing
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            } disabled:opacity-50`}
          >
            {followLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus className="h-4 w-4" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Follow
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onEditClick}
            className="flex items-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-100 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </button>
        )}
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
          <button
            onClick={() => setModalType('followers')}
            className="text-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="block font-bold text-zinc-900 dark:text-white">
              {followersCount !== undefined ? followersCount : (profile?.followers?.length || 0)}
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-500">Followers</span>
          </button>
          <button
            onClick={() => setModalType('following')}
            className="text-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="block font-bold text-zinc-900 dark:text-white">
              {followingCount !== undefined ? followingCount : (profile?.following?.length || 0)}
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-500">Following</span>
          </button>
          <div className="text-center">
            <span className="block font-bold text-zinc-900 dark:text-white">{profile?.shops?.length || 0}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-500">Shops</span>
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      {modalType && (
        <Modal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          title={modalType === 'followers' ? 'Followers' : 'Following'}
        >
          <div className="max-h-96 overflow-y-auto">
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-zinc-500 py-4">
                No {modalType} yet
              </p>
            ) : (
              <div className="space-y-2">
                {users.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      {user.profilePhoto ? (
                        <img
                          src={user.profilePhoto}
                          alt={user.name}
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-lg font-bold text-zinc-400">
                            {user.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-zinc-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
