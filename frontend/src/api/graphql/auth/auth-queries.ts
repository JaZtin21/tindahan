import { gql } from '@apollo/client';

// Auth GraphQL Queries and Mutations

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      success
      message
      data {
        user {
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
        accessToken
        refreshToken
      }
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      success
      message
      data {
        user {
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
        accessToken
        refreshToken
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      success
      message
      data {
        accessToken
        refreshToken
      }
    }
  }
`;

// Types for GraphQL
export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'OWNER' | 'ADMIN';
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'CUSTOMER' | 'OWNER' | 'ADMIN';
    shops: string[];
    createdAt: string;
    updatedAt?: string;
    isActive: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  success: boolean;
  message: string;
  data?: AuthResponse;
}
