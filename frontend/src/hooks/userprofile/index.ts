import { useMutation, useQuery } from '@apollo/client/react';
import { ME_QUERY, UPDATE_PROFILE_MUTATION } from '../../api/graphql/user/user-queries';
import type { UpdateProfileInput, UserPayload } from '../../types/user';

// Hook to get current user
export const useGetMe = (skip?: boolean) => {
  return useQuery<{ me: UserPayload }>(ME_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip,
  });
};

// Hook to update profile
export const useUpdateProfile = () => {
  const [mutate, { loading }] = useMutation<{ updateProfile: UserPayload }>(UPDATE_PROFILE_MUTATION);

  const updateProfile = async (input: UpdateProfileInput): Promise<UserPayload | null> => {
    try {
      const { data } = await mutate({ variables: { input } });
      return data?.updateProfile ?? null;
    } catch (error) {
      console.error('Update profile error:', error);
      return null;
    }
  };

  return { updateProfile, loading };
};

// Hook to upload profile photo
export const useUploadProfilePhoto = () => {
  const uploadProfilePhoto = async (file: File): Promise<{ success: boolean; url?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/profile-photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return { success: true, url: data.url };
    } catch (error) {
      console.error('Upload profile photo error:', error);
      return { success: false };
    }
  };

  return { uploadProfilePhoto, loading: false };
};

// Hook to upload cover photo
export const useUploadCoverPhoto = () => {
  const uploadCoverPhoto = async (file: File): Promise<{ success: boolean; url?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/cover-photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return { success: true, url: data.url };
    } catch (error) {
      console.error('Upload cover photo error:', error);
      return { success: false };
    }
  };

  return { uploadCoverPhoto, loading: false };
};

// Re-export types (Post type comes from '../map')
export type { User, UpdateProfileInput, UserPayload } from '../../types/user';
