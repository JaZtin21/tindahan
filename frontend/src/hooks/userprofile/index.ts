import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { ME_QUERY, UPDATE_PROFILE_MUTATION } from '../../api/graphql/user/user-queries';
import type { UpdateProfileInput, UserPayload, User } from '../../types/user';

// GraphQL mutations for photo uploads
const UPLOAD_PROFILE_PHOTO_MUTATION = gql`
  mutation UploadProfilePhoto($file: Upload!) {
    uploadProfilePhoto(file: $file) {
      success
      message
      data {
        id
        firstName
        lastName
        email
        phone
        birthday
        role
        profilePhoto
        coverPhoto
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

const UPLOAD_COVER_PHOTO_MUTATION = gql`
  mutation UploadCoverPhoto($file: Upload!) {
    uploadCoverPhoto(file: $file) {
      success
      message
      data {
        id
        firstName
        lastName
        email
        phone
        birthday
        role
        profilePhoto
        coverPhoto
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

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

// Hook to upload profile photo via GraphQL
export const useUploadProfilePhoto = () => {
  const [mutate, { loading }] = useMutation<{ uploadProfilePhoto: UserPayload }>(UPLOAD_PROFILE_PHOTO_MUTATION);

  const uploadProfilePhoto = async (file: File): Promise<{ success: boolean; url?: string; user?: User }> => {
    try {
      const { data } = await mutate({
        variables: { file },
        context: {
          headers: {
            'Apollo-Require-Preflight': 'true',
          },
        },
      });

      if (data?.uploadProfilePhoto?.success) {
        const userData = data.uploadProfilePhoto.data;
        return {
          success: true,
          url: userData?.profilePhoto || undefined,
          user: userData || undefined,
        };
      }
      return { success: false, url: undefined, user: undefined };
    } catch (error) {
      console.error('Upload profile photo error:', error);
      return { success: false };
    }
  };

  return { uploadProfilePhoto, loading };
};

// Hook to upload cover photo via GraphQL
export const useUploadCoverPhoto = () => {
  const [mutate, { loading }] = useMutation<{ uploadCoverPhoto: UserPayload }>(UPLOAD_COVER_PHOTO_MUTATION);

  const uploadCoverPhoto = async (file: File): Promise<{ success: boolean; url?: string; user?: User }> => {
    try {
      const { data } = await mutate({
        variables: { file },
        context: {
          headers: {
            'Apollo-Require-Preflight': 'true',
          },
        },
      });

      if (data?.uploadCoverPhoto?.success) {
        const userData = data.uploadCoverPhoto.data;
        return {
          success: true,
          url: userData?.coverPhoto || undefined,
          user: userData || undefined,
        };
      }
      return { success: false, url: undefined, user: undefined };
    } catch (error) {
      console.error('Upload cover photo error:', error);
      return { success: false };
    }
  };

  return { uploadCoverPhoto, loading };
};

// Re-export types (Post type comes from '../map')
export type { User, UpdateProfileInput, UserPayload } from '../../types/user';
