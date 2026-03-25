# Tindahan GraphQL API Documentation

## Overview
This document lists all available GraphQL APIs for the Tindahan backend. The API is organized by domain (Auth, User, Shop, Product) with Queries, Mutations, and Subscriptions.

**Base URL:** `http://localhost:8080/query`
**Playground:** `http://localhost:8080/playground`

---

## Authentication
Most APIs require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <accessToken>
```

---

## API Categories

### 1. Auth APIs (`auth.graphql`)

#### Queries
| API | Description | Auth Required |
|-----|-------------|---------------|
| `me` | Get current authenticated user's profile | ✅ Yes |
| `health` | Health check endpoint | ❌ No |

#### Mutations
| API | Description | Auth Required |
|-----|-------------|---------------|
| `login(input: LoginInput!)` | Authenticate user and get tokens | ❌ No |
| `signup(input: SignupInput!)` | Register new user | ❌ No |
| `refreshToken(input: RefreshTokenInput!)` | Refresh access token | ❌ No |

---

### 2. User APIs (`user.graphql`)

#### Queries
| API | Description | Auth Required |
|-----|-------------|---------------|
| `users(page: Int, limit: Int)` | List all users | ✅ Yes |

#### Mutations
| API | Description | Auth Required |
|-----|-------------|---------------|
| `updateProfile(input: UpdateProfileInput!)` | Update current user profile | ✅ Yes |
| `createUser(input: CreateUserInput!)` | Admin: Create new user | ✅ Yes |
| `deleteUser(id: ObjectID!)` | Admin: Delete user | ✅ Yes |
| `updateUserStatus(id: ObjectID!, isActive: Boolean!)` | Admin: Update user status | ✅ Yes |

---

### 3. Shop APIs (`shop.graphql`)

#### Queries
| API | Description | Auth Required | Notes |
|-----|-------------|---------------|-------|
| `shop(id: ObjectID!)` | Get single shop by ID | ✅ Yes | Returns any shop by ID |
| `myShops(page: Int, limit: Int)` | Get current owner's shops | ✅ Yes | Owner only - returns authenticated user's shops |

#### Mutations
| API | Description | Auth Required |
|-----|-------------|---------------|
| `createShop(input: CreateShopInput!)` | Create new shop | ✅ Yes |
| `updateShop(id: ObjectID!, input: UpdateShopInput!)` | Update shop | ✅ Yes |
| `deleteShop(id: ObjectID!)` | Delete shop | ✅ Yes |

---

### 4. Product/Item APIs (`product.graphql`)

#### Queries
| API | Description | Auth Required | Notes |
|-----|-------------|---------------|-------|
| `item(id: ObjectID!)` | Get single item by ID | ✅ Yes | Returns any item by ID |
| `items(input: ProductSearchInput)` | List/search all items | ✅ Yes | Returns all items (public search) |
| `myItems(page: Int, limit: Int)` | Get current user's items | ✅ Yes | Returns items from user's shops |

#### Mutations
| API | Description | Auth Required |
|-----|-------------|---------------|
| `createItem(input: CreateItemInput!)` | Create new item/product | ✅ Yes |
| `updateItem(id: ObjectID!, input: UpdateItemInput!)` | Update item | ✅ Yes |
| `deleteItem(id: ObjectID!)` | Delete item | ✅ Yes |

---

### 5. Subscription APIs (`subscription.graphql`)

| API | Description | Auth Required | Status |
|-----|-------------|---------------|--------|
| `itemStockUpdates(shopId: ObjectID!)` | Real-time inventory updates | ✅ Yes | 🚧 Mock/Not Implemented |
| `shopStatusUpdates` | Real-time shop status updates | ✅ Yes | 🚧 Mock/Not Implemented |

---

## Complete API List (Alphabetical)

### Queries (9)
1. `health` - Health check
2. `item(id)` - Get item by ID
3. `items(input)` - Search items
4. `me` - Current user profile
5. `myItems(page, limit)` - My items
6. `myShops(page, limit)` - My shops (owner only)
7. `shop(id)` - Get shop by ID
8. `users(page, limit)` - List users

### Mutations (13)
1. `createItem(input)` - Create item
2. `createShop(input)` - Create shop
3. `createUser(input)` - Create user (admin)
4. `deleteItem(id)` - Delete item
5. `deleteShop(id)` - Delete shop
6. `deleteUser(id)` - Delete user (admin)
7. `login(input)` - Login
8. `refreshToken(input)` - Refresh token
9. `signup(input)` - Signup
10. `updateItem(id, input)` - Update item
11. `updateProfile(input)` - Update profile
12. `updateShop(id, input)` - Update shop
13. `updateUserStatus(id, isActive)` - Update user status

### Subscriptions (2)
1. `itemStockUpdates(shopId)` - Real-time stock updates
2. `shopStatusUpdates` - Real-time shop status

---

## Implementation Status

| Resolver | Status | Database |
|----------|--------|----------|
| Auth (login, signup, refreshToken) | ✅ Complete | Real MongoDB |
| User (me, users, updateProfile, createUser, deleteUser, updateUserStatus) | ✅ Complete | Real MongoDB |
| Shop (shop, shops, myShops, createShop, updateShop, deleteShop) | ✅ Complete | Real MongoDB |
| Product (item, items, myItems, createItem, updateItem, deleteItem) | ✅ Complete | Real MongoDB |
| Subscription (itemStockUpdates, shopStatusUpdates) | 🚧 Mock | N/A |

---

## Example Queries

### Login
```graphql
mutation {
  login(input: { email: "user@example.com", password: "password123" }) {
    success
    message
    data {
      accessToken
      user {
        id
        name
        email
        role
      }
    }
  }
}
```

### Get My Shops
```graphql
query {
  myShops(page: 1, limit: 10) {
    success
    message
    data {
      id
      name
      location
      status
    }
  }
}
```

### Create Shop
```graphql
mutation {
  createShop(input: {
    name: "My Shop"
    location: "Manila"
    coordinates: { lat: 14.5995, lng: 120.9842 }
    coverPhoto: "shop.jpg"
    otherPhotos: []
    businessHours: { openTime: "08:00", closeTime: "18:00", days: ["Mon", "Tue"] }
    businessType: SARI_SARI_STORE
    paymentMethods: { cash: true, gcash: false, paymaya: false, card: false }
    delivery: { available: false }
    socialMedia: {}
    contactDetails: { phone: "09123456789", email: "shop@example.com", address: "123 Street" }
  }) {
    success
    message
    data {
      id
      name
    }
  }
}
```

---

## Notes

- All IDs are MongoDB ObjectIDs (24-character hex strings)
- Pagination defaults: page=1, limit=10
- Authentication is handled via JWT middleware
- Owner resolver handles shop/product CRUD operations
- User resolver handles user management
