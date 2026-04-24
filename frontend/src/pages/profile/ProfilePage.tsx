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
import { DELETE_POST_MUTATION } from '../../api/graphql/post/post-queries'
import { Modal } from '../../components'
import { useMutation } from '@apollo/client/react'
import { EditPostModal } from '../../components/posts/EditPostModal'
import type { Post } from '../../types/map'
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

  const { data: myPostsData, loading: myPostsLoading} = useMyPosts(1, 10, !isAuthenticated || !isOwnProfile)
  const { data: userPostsData, loading: userPostsLoading} = useGetUserPosts(targetUserId || null, 1, 10, isOwnProfile || !targetUserId)
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

  // Edit post modal state
  const [postToEdit, setPostToEdit] = useState<Post | null>(null)
  const [isEditPostOpen, setIsEditPostOpen] = useState(false)
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; post: Post | null }>({ isOpen: false, post: null })
  
  const [deletePost] = useMutation(DELETE_POST_MUTATION)

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

  // Handle edit post
  const handleEditPost = (post: Post) => {
    setPostToEdit(post)
    setIsEditPostOpen(true)
  }

  // Handle delete post
  const handleDeletePost = (post: Post) => {
    setDeleteModal({ isOpen: true, post })
  }

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
        isMyPosts={isOwnProfile}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
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

      {/* Edit Post Modal */}
      <EditPostModal
        post={postToEdit}
        isOpen={isEditPostOpen}
        onClose={() => setIsEditPostOpen(false)}
        onSuccess={() => {
          // Refetch posts after edit (not user data to avoid scroll)

        }}
      />

      {/* Delete Post Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, post: null })}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        type="error"
        showCancel
        onConfirm={async () => {
          if (deleteModal.post) {
            try {
              await deletePost({ 
                variables: { id: deleteModal.post.id },
                update: (cache) => {
                  // Remove the post from the cache without refetching
                  cache.modify({
                    fields: {
                      myPosts(existingPosts = {}) {
                        if (!existingPosts.data) return existingPosts
                        return {
                          ...existingPosts,
                          data: existingPosts.data.filter((p: any) => p.__ref !== `Post:${deleteModal.post!.id}` && p.id !== deleteModal.post!.id),
                          total: Math.max(0, (existingPosts.total || 0) - 1)
                        }
                      },
                      userPosts(existingPosts = {}) {
                        if (!existingPosts.data) return existingPosts
                        return {
                          ...existingPosts,
                          data: existingPosts.data.filter((p: any) => p.__ref !== `Post:${deleteModal.post!.id}` && p.id !== deleteModal.post!.id),
                          total: Math.max(0, (existingPosts.total || 0) - 1)
                        }
                      }
                    }
                  })
                }
              })
              setDeleteModal({ isOpen: false, post: null })
            } catch (error) {
              console.error('Failed to delete post:', error)
            }
          }
        }}
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
