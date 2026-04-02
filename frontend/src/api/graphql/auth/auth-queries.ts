import { gql } from '@apollo/client';

// Auth GraphQL Queries and Mutations

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

export const GOOGLE_LOGIN_MUTATION = gql`
  mutation GoogleLogin($input: GoogleLoginInput!) {
    googleLogin(input: $input) {
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

// Types for GraphQL
export interface RefreshTokenInput {
  refreshToken: string;
}

export interface GoogleLoginInput {
  credential: string;
  role?: 'CUSTOMER' | 'OWNER' | 'ADMIN';
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

export interface GoogleLoginResponse {
  googleLogin: AuthPayload;
}
