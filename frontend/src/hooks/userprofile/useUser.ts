import { useQuery } from '@apollo/client/react';
import { GET_USER } from '../../api/graphql/user/user-queries';

export function useGetUser(userId: string | null, skip: boolean = false) {
  return useQuery(GET_USER, {
    variables: { id: userId },
    skip: !userId || skip,
    fetchPolicy: 'cache-and-network',
  });
}
