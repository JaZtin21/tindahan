# API (MVP) — Tindahan

## Conventions
- Base URL: `/api`
- JSON request/response
- Auth: `Authorization: Bearer <token>` (token from Google Sign-In → backend session/JWT)
- IDs: UUID strings
- Errors: consistent envelope

### Error format

```json
{
  "error": {
    "code": "validation_error",
    "message": "lat is required",
    "details": { "field": "lat" }
  }
}
```

## Authentication

### `POST /auth/google`
Exchange Google ID token for a backend token/session.

Request:

```json
{ "id_token": "GOOGLE_ID_TOKEN" }
```

Response:

```json
{
  "access_token": "APP_ACCESS_TOKEN",
  "user": { "id": "uuid", "role": "customer", "display_name": "Ana" }
}
```

### `GET /me`
Get current user.

Response:

```json
{ "id": "uuid", "role": "owner", "display_name": "Ben", "email": "ben@example.com" }
```

## Stores

### `POST /stores` (owner)
Create a store with pinned location.

Request:

```json
{
  "name": "Tindahan ni Aling Rosa",
  "description": "Open daily",
  "address_text": "Barangay 123, City",
  "lat": 14.5995,
  "lng": 120.9842,
  "banner_image_key": null
}
```

Response:

```json
{
  "id": "uuid",
  "owner_user_id": "uuid",
  "name": "Tindahan ni Aling Rosa",
  "address_text": "Barangay 123, City",
  "lat": 14.5995,
  "lng": 120.9842,
  "banner_url": null
}
```

### `PATCH /stores/{storeId}` (owner)
Update store profile fields (name, description, hours/contact, banner).

### `GET /stores/{storeId}` (public)
Get store profile + summary stats.

Response (example):

```json
{
  "id": "uuid",
  "name": "Tindahan ni Aling Rosa",
  "description": "Open daily",
  "lat": 14.5995,
  "lng": 120.9842,
  "banner_url": "https://cdn.example.com/banners/x.jpg",
  "rating_avg": 4.6,
  "rating_count": 52,
  "inventory_last_updated_at": "2026-03-11T07:01:00Z"
}
```

### `GET /stores/search` (public)
Search stores near a coordinate, optionally filtering by item query.

Query params:
- `lat` (required)
- `lng` (required)
- `radius_m` (optional; default 2000)
- `q` (optional; item name query)
- `limit` (optional; default 30)

Response:

```json
{
  "center": { "lat": 14.5995, "lng": 120.9842 },
  "radius_m": 2000,
  "results": [
    {
      "store": { "id": "uuid", "name": "Tindahan A", "lat": 14.6, "lng": 120.98, "banner_url": null },
      "distance_m": 325,
      "match": {
        "q": "pancit canton",
        "matched_items": [
          { "catalog_item_id": "uuid", "name": "Pancit Canton (Chilimansi)", "in_stock": true, "last_updated_at": "2026-03-10T12:00:00Z" }
        ]
      }
    }
  ]
}
```

## Item catalog

### `GET /catalog/items` (public)
Autocomplete/search canonical items.

Query params:
- `q` (required)
- `limit` (optional)

Response:

```json
{
  "items": [
    { "id": "uuid", "name": "Pancit Canton", "category": "Food" }
  ]
}
```

## Inventory (owner)

### `GET /stores/{storeId}/inventory`
List inventory items for a store.

Response:

```json
{
  "store_id": "uuid",
  "items": [
    {
      "id": "uuid",
      "catalog_item": { "id": "uuid", "name": "Pancit Canton" },
      "in_stock": true,
      "price": 18.0,
      "quantity": null,
      "last_updated_at": "2026-03-10T12:00:00Z"
    }
  ]
}
```

### `PUT /stores/{storeId}/inventory/{inventoryItemId}`
Update an inventory item (stock/price/quantity).

Request:

```json
{ "in_stock": false, "price": 18.0, "quantity": null }
```

### `POST /stores/{storeId}/inventory`
Add a catalog item to the store inventory.

Request:

```json
{ "catalog_item_id": "uuid", "in_stock": true, "price": 18.0, "quantity": null }
```

## Item requests

### `POST /requests` (customer)
Create an item request to a store.

Request:

```json
{
  "store_id": "uuid",
  "catalog_item_id": "uuid",
  "free_text_item_name": null,
  "qty": 2,
  "notes": "If available, please reserve."
}
```

Response:

```json
{
  "id": "uuid",
  "status": "pending",
  "created_at": "2026-03-11T07:15:00Z"
}
```

### `GET /requests` (customer or owner)
List requests.

Query params (optional):
- `role_view`: `customer` | `owner` (derived from auth; optional if ambiguous)
- `store_id` (owner)
- `status`

Response:

```json
{
  "requests": [
    {
      "id": "uuid",
      "store": { "id": "uuid", "name": "Tindahan A" },
      "customer": { "id": "uuid", "display_name": "Ana" },
      "item": { "catalog_item_id": "uuid", "name": "Pancit Canton" },
      "qty": 2,
      "notes": "Please reserve",
      "status": "pending",
      "created_at": "2026-03-11T07:15:00Z"
    }
  ]
}
```

### `PATCH /requests/{requestId}` (owner)
Update request status.

Request:

```json
{ "status": "accepted", "owner_response_notes": "Ok, available until 5pm." }
```

## Reviews

### `POST /stores/{storeId}/reviews` (customer)
Create or update a review (one per customer per store).

Request:

```json
{ "rating": 5, "text": "Mabilis kausap, laging may stock." }
```

### `GET /stores/{storeId}/reviews` (public)
List reviews (paginated later).

Response:

```json
{
  "store_id": "uuid",
  "reviews": [
    { "id": "uuid", "rating": 5, "text": "Great", "created_at": "2026-03-11T07:20:00Z", "author": { "display_name": "Ana" } }
  ]
}
```

## Uploads (banner image)
For MVP, simplest approach is a direct upload endpoint that returns a `banner_image_key` or URL.

### `POST /uploads/store-banner` (owner)
Request: `multipart/form-data` with `file`

Response:

```json
{ "banner_image_key": "stores/uuid/banner.jpg", "banner_url": "https://cdn.example.com/stores/uuid/banner.jpg" }
```

## Notes (MVP simplifications)
- Pagination can be added later; start with `limit` defaults.
- Search relevance can evolve; MVP aims for correctness and speed.
- Consider returning both `distance_m` and a rounded `distance_label` on frontend (e.g. “0.3 km”).

