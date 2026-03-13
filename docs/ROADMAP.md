# Roadmap — Tindahan

## Guiding principles
- **Inventory freshness over complexity**: add features that increase accuracy and updates.
- **Trust and safety early**: verification and reporting before "marketplace money".
- **Geospatial + catalog foundations first**: these support everything later (orders, delivery, promos).

## Current Implementation Status:

### Completed - Backend Foundation
- **Go Backend with Clean Architecture** - Domain/Repository/Usecase/API layers
- **MongoDB Integration** - Authenticated database connection
- **JWT Authentication** - Secure user authentication with refresh tokens
- **RESTful API** - Complete CRUD operations for users, stores, products
- **Docker Support** - Containerized development and deployment
- **CORS Configuration** - Frontend integration ready
- **Environment Configuration** - Proper .env management

### Implemented API Endpoints:
```
Authentication:
- POST /api/v1/auth/signup
- POST /api/v1/auth/login  
- POST /api/v1/auth/refresh

Stores:
- GET /api/v1/stores (public search)
- GET /api/v1/stores/:id
- POST /api/v1/stores (protected)
- PUT /api/v1/stores/:id (protected)
- DELETE /api/v1/stores/:id (protected)
- GET /api/v1/my-stores (protected)

Products:
- GET /api/v1/products (public search)
- GET /api/v1/products/:id
- POST /api/v1/products (protected)
- PUT /api/v1/products/:id (protected)
- DELETE /api/v1/products/:id (protected)
- GET /api/v1/my-products (protected)

Users:
- GET /api/v1/user/profile (protected)
- PUT /api/v1/user/profile (protected)
- GET /api/v1/users (admin only)
- PUT /api/v1/users/:id/status (admin only)
```

### Database Schema:
```
Users Collection:
{
  "_id": "ObjectId",
  "first_name": "string",
  "last_name": "string", 
  "email": "string",
  "password": "hashed_string",
  "phone": "string",
  "role": "owner|customer|admin",
  "is_active": "boolean",
  "created_at": "Date",
  "updated_at": "Date"
}

Stores Collection:
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "address": "string",
  "city": "string",
  "latitude": "number",
  "longitude": "number", 
  "owner_id": "ObjectId",
  "category": "convenience_store|grocery|restaurant|pharmacy|other",
  "rating": "number",
  "is_active": "boolean",
  "created_at": "Date",
  "updated_at": "Date"
}

Products Collection:
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "category": "string",
  "price": "number",
  "image_url": "string",
  "store_id": "ObjectId",
  "stock": "number",
  "is_active": "boolean",
  "created_at": "Date", 
  "updated_at": "Date"
}
```

### Project Structure:
```
backend/
├── .env                    # Environment variables
├── Dockerfile              # Docker build configuration
├── docker-compose.yaml     # Services orchestration
├── README.md               # API documentation
├── go.mod                  # Go dependencies
├── go.sum                  # Dependency checksums
├── api/                    # HTTP layer
│   ├── controller/         # Request handlers (user, store, product)
│   ├── middleware/         # JWT auth, CORS, role checking
│   └── route/             # Route definitions
├── bootstrap/              # Application initialization
├── cmd/                    # Entry point
│   └── main.go            # Main application
├── domain/                 # Business entities
│   ├── user.go            # User model and DTOs
│   ├── store.go           # Store model and DTOs
│   ├── product.go         # Product model and DTOs
│   └── response.go        # Standard response formats
├── internal/               # Internal utilities
│   └── tokenutil/         # JWT token utilities
├── mongo/                  # Database connection
├── repository/             # Data access layer
│   ├── user_repository.go  # User CRUD operations
│   ├── store_repository.go # Store CRUD + geospatial search
│   └── product_repository.go # Product CRUD + filtering
└── usecase/                # Business logic layer
    ├── user_usecase.go    # User auth and profile management
    ├── store_usecase.go   # Store management and authorization
    └── product_usecase.go # Product management and search
```

### Currently Working:
- Frontend integration with React
- API testing and validation
- Production deployment preparation

## v1 (MVP) — Map + Inventory + Requests
Deliverables:
- Store owner can create store, pin location, upload banner
- Owner can manage inventory (in-stock + last-updated, optional price)
- Customer can search item near location and see nearest stores
- Customer can create item requests; owner can accept/decline/fulfill
- Reviews and rating summary

Operational focus:
- Simple moderation: report store/review (manual admin)
- Abuse prevention: rate limits, request quotas
- Observability: logs + basic metrics

## v1.1 — Quality & retention
Improve usefulness and reduce staleness:
- Inventory “freshness nudges” for owners
- Suggested restock list from request frequency
- Better search matching (synonyms, spelling tolerance)
- Store hours + “open now” indicator
- Saved/favorite stores and recent searches

## v1.2 — Trust & verification
Reduce fake listings and improve confidence:
- Owner phone verification (OTP)
- Store verification options (community validation, admin verification badge)
- Review integrity: prevent spam, limit to verified users, detect duplicates
- Customer safety: report/block store; store can block abusive users

## v2 — Orders (pickup-first)
Introduce commerce carefully:
- “Reserve for pickup” orders (no delivery yet)
- Order statuses: pending/confirmed/ready/collected/cancelled
- Optional payment: cash on pickup (start), then online payments
- Owner lightweight order management

Key prerequisite:
- Stronger inventory model for ordered items (quantity + reservation holds)

## v2.1 — Payments (optional, region/legal dependent)
Options:
- Cash on pickup as default
- Online payments via local provider integration

Risks:
- chargebacks/disputes
- compliance and KYC for payouts (if platform handles money)

## v3 — Delivery + logistics (only if validated)
If demand exists:
- Customer chooses delivery
- Rider/partner integration (or third-party delivery APIs)
- Delivery fee estimation, tracking, proof of delivery

## v4 — Growth features
- Promotions: featured items, bundles, time-based deals
- Loyalty: stamps, points
- Insights for owners: best-sellers, demand heatmap
- Multi-branch stores and staff accounts

## Tech roadmap (supporting evolution)
- OpenAPI spec + generated client for frontend
- Background jobs (e.g., reminders, summary emails) via a job runner
- Optional realtime updates (SSE/WebSockets) for request/order status
- Search upgrade path:
  - Postgres trigram/FTS first
  - Later: dedicated search (Meilisearch/Elasticsearch) if needed

## “Kill criteria” (when to stop/redirect)
- If owners don’t update inventory weekly even with nudges, shift emphasis to:
  - request-based demand + “confirm availability” flows
  - lighter-weight “usually has this item” heuristics
- If customers don’t trust listings, prioritize verification and freshness cues over new features.

