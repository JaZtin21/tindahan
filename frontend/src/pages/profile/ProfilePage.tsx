import { useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useApolloClient } from '@apollo/client/react'
import { useAuth } from '../../api/graphql/apolloProviderWithAuth'
import {
  useGetMe,
  useGetUser,
  useUpdateProfile,
  useUploadProfilePhoto,
  useUploadCoverPhoto,
  useFollowUser,
  useUnfollowUser,
} from '../../hooks'
import { useMyPosts, useGetUserPosts } from '../../api/graphql/post/usePost'
import { Modal } from '../../components'
import {
  CoverPhotoSection,
  ProfileInfoSection,
  PostsSection,
  EditProfileModal,
  ProfileLoadingState,
  AuthRequiredMessage,
} from '../../components/profile'
import type { EditFormData } from '../../types/profile'
import type { RootState } from '../../store'

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>()
  const currentUser = useSelector((state: RootState) => state.user)
  
  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId || userId === currentUser?.id
  const targetUserId = isOwnProfile ? currentUser?.id : userId

  const { isLoading: authLoading, isAuthenticated } = useAuth()
  
  // Fetch profile data
  const { data: meData, loading: meLoading, refetch: refetchMe } = useGetMe(!isAuthenticated || !isOwnProfile)
  const { data: userData, loading: userLoading } = useGetUser(targetUserId || null, isOwnProfile)

  // Use appropriate data based on whether viewing own or other profile
  const profileData = isOwnProfile ? meData?.me?.data : userData?.user
  const profileLoading = isOwnProfile ? meLoading : userLoading

  const { data: myPostsData, loading: myPostsLoading } = useMyPosts(1, 10, !isAuthenticated || !isOwnProfile)
  const { data: userPostsData, loading: userPostsLoading } = useGetUserPosts(targetUserId || null, 1, 10, isOwnProfile || !targetUserId)
  const { updateProfile, loading: updating } = useUpdateProfile()
  const { uploadProfilePhoto, loading: uploadingProfile } = useUploadProfilePhoto()
  const { uploadCoverPhoto, loading: uploadingCover } = useUploadCoverPhoto()
  
  // Follow/unfollow hooks
  const { follow, loading: followLoading } = useFollowUser()
  const { unfollow, loading: unfollowLoading } = useUnfollowUser()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormData>({
    firstName: '',
    lastName: '',
    birthday: ''
  })

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

  const posts = isOwnProfile 
    ? myPostsData?.myPosts?.data || [] 
    : userPostsData?.userPosts?.data || []


  const handleEditClick = () => {
    if (profileData) {
      const nameParts = (profileData.name || '').split(' ')
      setEditForm({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        birthday: profileData.birthday || ''
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
      refetchMe()
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
        refetchMe()
      }
    }
  }

  const handleCoverPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const result = await uploadCoverPhoto(file)
      if (result?.success) {
        refetchMe()
      }
    }
  }

  const client = useApolloClient()
  const currentUserId = currentUser?.id

  const updateUserCache = (userId: string, addFollower: boolean) => {
    if (!currentUserId) return

    // Update the GetUser query cache
    client.cache.modify({
      id: client.cache.identify({ __typename: 'User', id: userId }),
      fields: {
        followers(existingFollowers = []) {
          if (addFollower) {
            return [...existingFollowers, currentUserId]
          } else {
            return existingFollowers.filter((id: string) => id !== currentUserId)
          }
        },
        followersCount(existingCount = 0) {
          return addFollower ? existingCount + 1 : existingCount - 1
        },
      },
    })
  }

  const handleFollow = async () => {
    if (!userId) return
    const result = await follow(userId)
    if (result?.success) {
      updateUserCache(userId, true)
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'You are now following this user!',
      })
    } else {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: result?.message || 'Failed to follow user.',
      })
    }
  }

  const handleUnfollow = async () => {
    if (!userId) return
    const result = await unfollow(userId)
    if (result?.success) {
      updateUserCache(userId, false)
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'You have unfollowed this user.',
      })
    } else {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: result?.message || 'Failed to unfollow user.',
      })
    }
  }

  if (authLoading) {
    return <ProfileLoadingState message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <AuthRequiredMessage />
  }

  if (profileLoading) {
    return <ProfileLoadingState message="Loading profile..." />
  }

  if (!profileData) {
    return (
      <div className="mx-auto max-w-4xl pb-8 pt-8 text-center">
        <p className="text-zinc-500">User not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <CoverPhotoSection
        profile={profileData}
        coverImgError={coverImgError}
        setCoverImgError={setCoverImgError}
        uploadingCover={uploadingCover}
        onCoverPhotoChange={handleCoverPhotoChange}
        isViewOnly={!isOwnProfile}
      />

      <ProfileInfoSection
        profile={profileData}
        uploadingProfile={uploadingProfile}
        postsCount={posts.length}
        onProfilePhotoChange={handleProfilePhotoChange}
        onEditClick={handleEditClick}
        isViewOnly={!isOwnProfile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        followLoading={followLoading || unfollowLoading}
      />

      <PostsSection
        posts={posts}
        postsLoading={isOwnProfile ? myPostsLoading : userPostsLoading}
        profilePhoto={profileData?.profilePhoto}
      />

      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditing}
          editForm={editForm}
          updating={updating}
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          onChange={setEditForm}
        />
      )}

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
