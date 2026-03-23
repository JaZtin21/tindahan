import { gql } from '@apollo/client';

// Shop GraphQL Queries and Mutations

export const SHOP_QUERY = gql`
  query Shop($id: ID!) {
    shop(id: $id) {
      success
      message
      data {
        id
        name
        location
        coordinates {
          lat
          lng
        }
        coverPhoto
        otherPhotos
        businessHours {
          openTime
          closeTime
          days
        }
        businessType
        paymentMethods {
          cash
          gcash
          paymaya
          card
        }
        delivery {
          available
          radius
          fee
          minOrder
        }
        socialMedia {
          facebook
          instagram
        }
        verification {
          isVerified
          verifiedDate
          verificationId
        }
        contactDetails {
          phone
          email
          address
        }
        inventory {
          id
          name
          price
          description
          category
          subCategory
          stock
          coverPhoto
          otherPhotos
          sku
          barcode
          weight
          unit
          expiryDate
          supplier
          brand
          origin
          tags
          isActive
          discount {
            percentage
            validUntil
          }
          createdAt
          updatedAt
          shopId
        }
        createdAt
        updatedAt
        createdBy
        status
      }
    }
  }
`;

export const SHOPS_QUERY = gql`
  query Shops($input: ShopSearchInput) {
    shops(input: $input) {
      success
      message
      data {
        id
        name
        location
        coordinates {
          lat
          lng
        }
        coverPhoto
        businessType
        status
        contactDetails {
          phone
          email
          address
        }
        verification {
          isVerified
        }
      }
    }
  }
`;

// Public Shop Queries (for normal users browsing)
export const PUBLIC_SHOPS_QUERY = gql`
  query Shops($input: ShopSearchInput) {
    shops(input: $input) {
      success
      message
      data {
        id
        name
        location
        coordinates {
          lat
          lng
        }
        coverPhoto
        businessType
        status
        contactDetails {
          phone
          email
          address
        }
        verification {
          isVerified
        }
      }
    }
  }
`;

// Note: Shop mutations (CreateShop, UpdateShop, DeleteShop) are now in owner-queries.ts

// Note: Shop mutations (CreateShop, UpdateShop, DeleteShop) are now in owner-queries.ts

// Types for GraphQL
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BusinessHours {
  openTime: string;
  closeTime: string;
  days: string[];
}

export interface PaymentMethods {
  cash: boolean;
  gcash: boolean;
  paymaya: boolean;
  card: boolean;
}

export interface DeliveryOptions {
  available: boolean;
  radius?: number;
  fee?: number;
  minOrder?: number;
}

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
}

export interface Verification {
  isVerified: boolean;
  verifiedDate?: string;
  verificationId?: string;
}

export interface ContactDetails {
  phone: string;
  email: string;
  address: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  coordinates: Coordinates;
  coverPhoto: string;
  otherPhotos: string[];
  businessHours: BusinessHours;
  businessType: 'SARI_SARI_STORE' | 'GROCERY' | 'CONVENIENCE_STORE' | 'MINI_MART';
  paymentMethods: PaymentMethods;
  delivery: DeliveryOptions;
  socialMedia: SocialMedia;
  verification: Verification;
  contactDetails: ContactDetails;
  inventory: Item[];
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface Item {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  subCategory?: string;
  stock: number;
  coverPhoto: string;
  otherPhotos: string[];
  sku?: string;
  barcode?: string;
  weight?: number;
  unit?: string;
  expiryDate?: string;
  supplier?: string;
  brand?: string;
  origin?: string;
  tags: string[];
  isActive: boolean;
  discount?: {
    percentage?: number;
    validUntil?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  shopId: string;
}

export interface ShopSearchInput {
  query?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  businessType?: 'SARI_SARI_STORE' | 'GROCERY' | 'CONVENIENCE_STORE' | 'MINI_MART';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  page?: number;
  limit?: number;
}

export interface CreateShopInput {
  name: string;
  location: string;
  coordinates: Coordinates;
  coverPhoto: string;
  otherPhotos: string[];
  businessHours: BusinessHours;
  businessType: 'SARI_SARI_STORE' | 'GROCERY' | 'CONVENIENCE_STORE' | 'MINI_MART';
  paymentMethods: PaymentMethods;
  delivery: DeliveryOptions;
  socialMedia: SocialMedia;
  contactDetails: ContactDetails;
}

export interface UpdateShopInput {
  name?: string;
  location?: string;
  coordinates?: Coordinates;
  coverPhoto?: string;
  otherPhotos?: string[];
  businessHours?: BusinessHours;
  businessType?: 'SARI_SARI_STORE' | 'GROCERY' | 'CONVENIENCE_STORE' | 'MINI_MART';
  paymentMethods?: PaymentMethods;
  delivery?: DeliveryOptions;
  socialMedia?: SocialMedia;
  contactDetails?: ContactDetails;
}

export interface ShopPayload {
  success: boolean;
  message: string;
  data?: Shop;
}

export interface ShopsPayload {
  success: boolean;
  message: string;
  data: Shop[];
}

export interface ShopDeletePayload {
  success: boolean;
  message: string;
}
