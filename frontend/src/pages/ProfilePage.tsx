import { useState, useRef, type ChangeEvent } from 'react'
import { Camera, MapPin, Calendar, Edit3, X, Check, Loader2, ImageIcon } from 'lucide-react'
import { useAuth } from '../api/graphql/apolloProviderWithAuth'
import {
  useGetMe,
  useUpdateProfile,
  useUploadProfilePhoto,
  useUploadCoverPhoto,
} from '../hooks'
import { useMyPosts } from '../api/graphql/post/usePost'
import type { Post } from '../types'
import { Modal } from '../components'
import { PhotoGallery } from '../components/common'

interface EditFormData {
  firstName: string
  lastName: string
  birthday: string
}

// Component to handle Google profile photos with error fallback
function PostAuthorAvatar({ profilePhoto, authorName }: { profilePhoto?: string; authorName: string }) {
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

export function ProfilePage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const { data: meData, loading: meLoading, refetch } = useGetMe(!isAuthenticated)
  const { data: postsData, loading: postsLoading } = useMyPosts(1, 10, !isAuthenticated)
  const { updateProfile, loading: updating } = useUpdateProfile()
  const { uploadProfilePhoto, loading: uploadingProfile } = useUploadProfilePhoto()
  const { uploadCoverPhoto, loading: uploadingCover } = useUploadCoverPhoto()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormData>({
    firstName: '',
    lastName: '',
    birthday: ''
  })

  const [profileImgError, setProfileImgError] = useState(false)
  const [coverImgError, setCoverImgError] = useState(false)

  // Modal state for success/error messages
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  })

  const profilePhotoRef = useRef<HTMLInputElement>(null)
  const coverPhotoRef = useRef<HTMLInputElement>(null)

  const profile = meData?.me?.data
  const posts = postsData?.myPosts?.data || []

  const handleEditClick = () => {
    if (profile) {
      const nameParts = (profile.name || '').split(' ')
      setEditForm({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        birthday: profile.birthday || ''
      })
    }
    setIsEditing(true)
  }

  const handleSave = async () => {
    const result = await updateProfile({
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      birthday: editForm.birthday
    })
    if (result?.success) {
      setIsEditing(false)
      refetch()
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully!',
      })
    } else {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: result?.message || 'Failed to update profile. Please try again.',
      })
    }
  }

  const handleProfilePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const result = await uploadProfilePhoto(file)
      if (result?.success) {
        refetch()
      }
    }
  }

  const handleCoverPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const result = await uploadCoverPhoto(file)
      if (result?.success) {
        refetch()
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-zinc-400">Checking authentication...</span>
      </div>
    )
  }

  // Show login message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">Please log in to view your profile</p>
      </div>
    )
  }

  // Show loading while fetching profile data
  if (meLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-zinc-400">Loading profile...</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-8">
      {/* Cover Photo Section */}
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
        
        {/* Cover Photo Upload Button - z-10 to ensure clickable */}
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
          onChange={handleCoverPhotoChange}
        />
      </div>

      {/* Profile Info Section */}
      <div className="relative px-4 sm:px-6">
        {/* Profile Photo */}
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
            
            {/* Profile Photo Upload Button */}
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
              onChange={handleProfilePhotoChange}
            />
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={handleEditClick}
            className="flex items-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-100 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </button>
        </div>

        {/* User Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
              {profile?.name || 'User'}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">{profile?.email}</p>
          </div>

          {/* Info Grid */}
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

          {/* Stats */}
          <div className="flex gap-6 border-y border-zinc-200 dark:border-zinc-800 py-3">
            <div className="text-center">
              <span className="block font-bold text-zinc-900 dark:text-white">{profile?.postsCount || 0}</span>
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

      {/* Posts Section */}
      <div className="mt-8 px-4 sm:px-6">
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">Posts</h2>
        
        {postsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No posts yet</p>
            <p className="mt-1 text-sm text-zinc-500">Your posts will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: Post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4"
              >
                {/* Post Header */}
                <div className="mb-3 flex items-center gap-3">
                  <PostAuthorAvatar profilePhoto={profile?.profilePhoto} authorName={post.author?.name || 'Unknown'} />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{post.author?.name || 'Unknown'}</p>
                    <p className="text-xs text-zinc-500">{formatDate(post.createdAt || '')}</p>
                  </div>
                </div>

                {/* Post Content */}
                {post.title && (
                  <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">{post.title}</h3>
                )}
                <p className="mb-3 text-zinc-700 dark:text-zinc-300">{post.text}</p>

                {/* Post Photos - Using PhotoGallery with lightbox */}
                {post.photos && post.photos.length > 0 && (
                  <div className="mb-3">
                    <PhotoGallery photos={post.photos} size="large" />
                  </div>
                )}

                {/* Post Stats */}
                <div className="flex items-center gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-sm text-zinc-500">
                  <span>{post.likes} likes</span>
                  <span>{post.commentCount} comments</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Birthday</label>
                <input
                  type="date"
                  value={editForm.birthday}
                  onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updating}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />
    </div>
  )
}

export default ProfilePage
