import { gql } from '@apollo/client';

// Public GraphQL Queries (for search and discovery)

export const HEALTH_QUERY = gql`
  query Health {
    health
  }
`;

// Re-export shop and item queries for public access
export { SHOP_QUERY, SHOPS_QUERY } from '../shop/shop-queries';
export { ITEM_QUERY, ITEMS_QUERY } from '../product/product-queries';

// Types for GraphQL
export interface HealthResponse {
  health: string;
}
