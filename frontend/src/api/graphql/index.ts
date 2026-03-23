// Main GraphQL exports
export * from './auth/auth-queries';
export * from './user/user-queries';
export * from './shop/shop-queries';
export * from './product/product-queries';
export * from './owner/owner-queries';
export * from './public/public-queries';
export * from './subscriptions/subscriptions';

// Explicit re-exports to resolve conflicts
export type {
  Shop,
  ShopPayload,
  ShopsPayload,
  ShopSearchInput,
  CreateShopInput,
  UpdateShopInput,
  Coordinates,
  BusinessHours,
  PaymentMethods,
  DeliveryOptions,
  SocialMedia,
  Verification,
  ContactDetails,
  ShopDeletePayload
} from './shop/shop-queries';

export type {
  Item,
  ItemPayload,
  ItemsPayload,
  ProductSearchInput,
  CreateItemInput,
  UpdateItemInput,
  Discount,
  ProductDeletePayload
} from './product/product-queries';

export type {
  OwnerShop,
  OwnerItem,
  ShopAnalytics,
  ItemAnalytics,
  BulkUpdateResponse
export {
  GET_OWNER_SHOPS_QUERY,
  CREATE_OWNER_SHOP_MUTATION,
  UPDATE_OWNER_SHOP_MUTATION,
  DELETE_OWNER_SHOP_MUTATION,
  UPDATE_SHOP_STATUS_MUTATION,
  GET_SHOP_ANALYTICS_QUERY,
  GET_OWNER_ITEMS_QUERY,
  CREATE_OWNER_ITEM_MUTATION,
  UPDATE_OWNER_ITEM_MUTATION,
  DELETE_OWNER_ITEM_MUTATION,
  UPDATE_ITEM_STOCK_MUTATION,
  GET_ITEM_ANALYTICS_QUERY,
  BULK_UPDATE_ITEMS_MUTATION
} from './owner/owner-queries';

export {
  SHOP_QUERY,
  SHOPS_QUERY as PUBLIC_SHOPS_QUERY
} from './shop/shop-queries';

export {
  ITEM_QUERY,
  ITEMS_QUERY as PUBLIC_ITEMS_QUERY
} from './product/product-queries';
