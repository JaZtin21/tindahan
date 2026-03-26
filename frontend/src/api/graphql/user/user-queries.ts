import { gql } from '@apollo/client';

// User GraphQL Queries and Mutations

export const ME_QUERY = gql`
  query Me {
    me {
      success
      message
      data {
        id
        name
        email
        phone
        role
        shops
        createdAt
        updatedAt
        isActive
      }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      success
      message
      data {
        id
        name
        email
        phone
        role
        shops
        createdAt
        updatedAt
        isActive
      }
    }
  }
`;

export const USERS_QUERY = gql`
  query Users($page: Int, $limit: Int) {
    users(page: $page, limit: $limit) {
      id
      name
      email
      phone
      role
      shops
      createdAt
      updatedAt
      isActive
    }
  }
`;

export const UPDATE_USER_STATUS_MUTATION = gql`
  mutation UpdateUserStatus($id: ID!, $isActive: Boolean!) {
    updateUserStatus(id: $id, isActive: $isActive) {
      success
      message
      data {
        id
        name
        email
        phone
        role
        shops
        createdAt
        updatedAt
        isActive
      }
    }
  }
`;

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      success
      message
      data {
        id
        name
        email
        phone
        role
        shops
        createdAt
        updatedAt
        isActive
      }
    }
  }
`;

export const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

// Types for GraphQL
export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN';
  shops: string[];
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface UserPayload {
  success: boolean;
  message: string;
  data?: User;
}

export interface UsersPayload {
  success: boolean;
  message: string;
  data: User[];
}
