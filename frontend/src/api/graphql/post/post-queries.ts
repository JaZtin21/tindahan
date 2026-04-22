import { gql } from '@apollo/client';

// Post GraphQL Queries and Mutations

export const POSTS_QUERY = gql`
  query Posts($page: Int, $limit: Int) {
    posts(page: $page, limit: $limit) {
      success
      message
      data {
        id
        title
        text
        photos
        types
        author {
          id
          name
          email
          role
          isActive
        }
        location {
          lat
          lng
          name
        }
        likes
        isLiked
        commentCount
        createdAt
        updatedAt
      }
      total
      page
      limit
    }
  }
`;

export const POST_QUERY = gql`
  query Post($id: ObjectID!) {
    post(id: $id) {
      success
      message
      data {
        id
        title
        text
        photos
        types
        author {
          id
          name
          email
          role
          isActive
        }
        location {
          lat
          lng
          name
        }
        likes
        isLiked
        comments {
          id
          text
          author {
            id
            name
            email
          }
          createdAt
        }
        commentCount
        createdAt
        updatedAt
      }
    }
  }
`;

export const MY_POSTS_QUERY = gql`
  query MyPosts($page: Int, $limit: Int) {
    myPosts(page: $page, limit: $limit) {
      success
      message
      data {
        id
        title
        text
        photos
        types
        author {
          id
          name
          email
          role
          isActive
        }
        location {
          lat
          lng
          name
        }
        likes
        isLiked
        commentCount
        createdAt
        updatedAt
      }
      total
      page
      limit
    }
  }
`;

export const USER_POSTS_QUERY = gql`
  query UserPosts($userId: ObjectID!, $page: Int, $limit: Int) {
    userPosts(userId: $userId, page: $page, limit: $limit) {
      success
      message
      data {
        id
        title
        text
        photos
        types
        author {
          id
          name
          email
          role
          isActive
        }
        location {
          lat
          lng
          name
        }
        likes
        isLiked
        commentCount
        createdAt
        updatedAt
      }
      total
      page
      limit
    }
  }
`;

export const POSTS_NEAR_LOCATION_QUERY = gql`
  query PostsNearLocation($lat: Float!, $lng: Float!, $radius: Float, $page: Int, $limit: Int) {
    postsNearLocation(lat: $lat, lng: $lng, radius: $radius, page: $page, limit: $limit) {
      success
      message
      data {
        id
        title
        text
        photos
        types
        author {
          id
          name
          email
          role
          isActive
        }
        location {
          lat
          lng
          name
        }
        likes
        isLiked
        commentCount
        createdAt
        updatedAt
      }
      total
      page
      limit
    }
  }
`;

export const CREATE_POST_MUTATION = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      success
      message
      data {
        id
        title
        text
        photos
        types
        author {
          id
          name
          email
          role
        }
        location {
          lat
          lng
          name
        }
        likes
        isLiked
        commentCount
        createdAt
      }
    }
  }
`;

export const UPDATE_POST_MUTATION = gql`
  mutation UpdatePost($id: ObjectID!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
      success
      message
      data {
        id
        title
        text
        photos
        types
        author {
          id
          name
          email
        }
        location {
          lat
          lng
          name
        }
        likes
        isLiked
        commentCount
        createdAt
        updatedAt
      }
    }
  }
`;

export const DELETE_POST_MUTATION = gql`
  mutation DeletePost($id: ObjectID!) {
    deletePost(id: $id) {
      success
      message
    }
  }
`;

export const LIKE_POST_MUTATION = gql`
  mutation LikePost($id: ObjectID!) {
    likePost(id: $id) {
      success
      message
      data {
        id
        likes
        isLiked
      }
    }
  }
`;

export const UNLIKE_POST_MUTATION = gql`
  mutation UnlikePost($id: ObjectID!) {
    unlikePost(id: $id) {
      success
      message
      data {
        id
        likes
        isLiked
      }
    }
  }
`;
