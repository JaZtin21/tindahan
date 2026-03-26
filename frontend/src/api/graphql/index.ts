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
  OwnerItem
} from './owner/owner-queries';

// Explicit exports from shop-queries (avoid naming conflicts)
export {
  SHOP_QUERY,
  SHOPS_QUERY,
  CREATE_SHOP_MUTATION,
  UPDATE_SHOP_MUTATION,
  DELETE_SHOP_MUTATION
} from './shop/shop-queries';

// Explicit exports from product-queries
export {
  ITEM_QUERY,
  ITEMS_QUERY,
  CREATE_ITEM_MUTATION,
  UPDATE_ITEM_MUTATION,
  DELETE_ITEM_MUTATION,
  PUBLIC_ITEMS_QUERY
} from './product/product-queries';
