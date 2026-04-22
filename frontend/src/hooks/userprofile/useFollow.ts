import { useMutation } from '@apollo/client/react';
import { FOLLOW_USER, UNFOLLOW_USER } from '../../api/graphql/follow/mutations';

export function useFollowUser() {
  const [followUser, { loading }] = useMutation(FOLLOW_USER, {
    fetchPolicy: 'no-cache'
  });

  const follow = async (userId: string) => {
    try {
      const result = await followUser({
        variables: { userId }
      });
      return result.data?.followUser;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to follow user'
      };
    }
  };

  return { follow, loading };
}

export function useUnfollowUser() {
  const [unfollowUser, { loading }] = useMutation(UNFOLLOW_USER, {
    fetchPolicy: 'no-cache'
  });

  const unfollow = async (userId: string) => {
    try {
      const result = await unfollowUser({
        variables: { userId }
      });
      return result.data?.unfollowUser;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unfollow user'
      };
    }
  };

  return { unfollow, loading };
}
