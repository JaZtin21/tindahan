import { gql } from '@apollo/client';

// Owner-specific GraphQL Queries and Mutations

// Owner Shop Queries
export const GET_OWNER_SHOPS_QUERY = gql`
  query GetOwnerShops($page: Int, $limit: Int) {
    myShops(page: $page, limit: $limit) {
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
        createdAt
        updatedAt
        createdBy
        status
      }
    }
  }
`;

// Owner Shop Mutations
export const CREATE_OWNER_SHOP_MUTATION = gql`
  mutation CreateShop($input: CreateShopInput!) {
    createShop(input: $input) {
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
        createdAt
        updatedAt
        createdBy
        status
      }
    }
  }
`;

export const UPDATE_OWNER_SHOP_MUTATION = gql`
  mutation UpdateShop($id: ID!, $input: UpdateShopInput!) {
    updateShop(id: $id, input: $input) {
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
        createdAt
        updatedAt
        createdBy
        status
      }
    }
  }
`;

export const DELETE_OWNER_SHOP_MUTATION = gql`
  mutation DeleteShop($id: ID!) {
    deleteShop(id: $id) {
      success
      message
    }
  }
`;

export const UPDATE_SHOP_STATUS_MUTATION = gql`
  mutation UpdateShopStatus($id: ID!, $status: String!) {
    updateShopStatus(id: $id, status: $status) {
      success
      message
      data {
        id
        status
      }
    }
  }
`;

export const GET_SHOP_ANALYTICS_QUERY = gql`
  query GetShopAnalytics($shopId: ID!) {
    getShopAnalytics(shopId: $shopId) {
      success
      message
      data {
        shopId
        totalViews
        totalOrders
        revenue
        topItems {
          id
          name
          sales
        }
      }
    }
  }
`;

// Owner Product Queries
export const GET_OWNER_ITEMS_QUERY = gql`
  query GetOwnerItems($page: Int, $limit: Int) {
    myItems(page: $page, limit: $limit) {
      success
      message
      data {
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
    }
  }
`;

// Owner Product Mutations
export const CREATE_OWNER_ITEM_MUTATION = gql`
  mutation CreateItem($input: CreateItemInput!) {
    createItem(input: $input) {
      success
      message
      data {
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
    }
  }
`;

export const UPDATE_OWNER_ITEM_MUTATION = gql`
  mutation UpdateItem($id: ID!, $input: UpdateItemInput!) {
    updateItem(id: $id, input: $input) {
      success
      message
      data {
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
    }
  }
`;

export const DELETE_OWNER_ITEM_MUTATION = gql`
  mutation DeleteItem($id: ID!) {
    deleteItem(id: $id) {
      success
      message
    }
  }
`;

export const UPDATE_ITEM_STOCK_MUTATION = gql`
  mutation UpdateItemStock($id: ID!, $stock: Int!) {
    updateItemStock(id: $id, stock: $stock) {
      success
      message
      data {
        id
        stock
      }
    }
  }
`;

export const GET_ITEM_ANALYTICS_QUERY = gql`
  query GetItemAnalytics($itemId: ID!) {
    getItemAnalytics(itemId: $itemId) {
      success
      message
      data {
        itemId
        totalViews
        totalSales
        revenue
        lowStock
        stock
      }
    }
  }
`;

export const BULK_UPDATE_ITEMS_MUTATION = gql`
  mutation BulkUpdateItems($itemIds: [ID!]!, $updates: String!) {
    bulkUpdateItems(itemIds: $itemIds, updates: $updates) {
      success
      message
      data {
        updatedCount
        itemIds
      }
    }
  }
`;

// Types for Owner GraphQL Operations
export interface OwnerShop {
  id: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  coverPhoto: string;
  otherPhotos: string[];
  businessHours: {
    openTime: string;
    closeTime: string;
    days: string[];
  };
  businessType: 'SARI_SARI_STORE' | 'GROCERY' | 'CONVENIENCE_STORE' | 'MINI_MART';
  paymentMethods: {
    cash: boolean;
    gcash: boolean;
    paymaya: boolean;
    card: boolean;
  };
  delivery: {
    available: boolean;
    radius?: number;
    fee?: number;
    minOrder?: number;
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
  };
  verification: {
    isVerified: boolean;
    verifiedDate?: string;
    verificationId?: string;
  };
  contactDetails: {
    phone: string;
    email: string;
    address: string;
  };
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface OwnerItem {
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

export interface ShopAnalytics {
  shopId: string;
  totalViews: number;
  totalOrders: number;
  revenue: number;
  topItems: {
    id: string;
    name: string;
    sales: number;
  }[];
}

export interface ItemAnalytics {
  itemId: string;
  totalViews: number;
  totalSales: number;
  revenue: number;
  lowStock: boolean;
  stock: number;
}

export interface BulkUpdateResponse {
  updatedCount: number;
  itemIds: string[];
}
