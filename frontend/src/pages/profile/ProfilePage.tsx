import { useState, type ChangeEvent } from 'react'
import { useAuth } from '../../api/graphql/apolloProviderWithAuth'
import {
  useGetMe,
  useUpdateProfile,
  useUploadProfilePhoto,
  useUploadCoverPhoto,
} from '../../hooks'
import { useMyPosts } from '../../api/graphql/post/usePost'
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

  if (authLoading) {
    return <ProfileLoadingState message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <AuthRequiredMessage />
  }

  if (meLoading) {
    return <ProfileLoadingState message="Loading profile..." />
  }

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <CoverPhotoSection
        profile={profile}
        coverImgError={coverImgError}
        setCoverImgError={setCoverImgError}
        uploadingCover={uploadingCover}
        onCoverPhotoChange={handleCoverPhotoChange}
      />

      <ProfileInfoSection
        profile={profile}
        uploadingProfile={uploadingProfile}
        postsCount={posts.length}
        onProfilePhotoChange={handleProfilePhotoChange}
        onEditClick={handleEditClick}
      />

      <PostsSection
        posts={posts}
        postsLoading={postsLoading}
        profilePhoto={profile?.profilePhoto}
      />

      <EditProfileModal
        isOpen={isEditing}
        editForm={editForm}
        updating={updating}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
        onChange={setEditForm}
      />

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
