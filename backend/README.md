# Tindahan Backend API

A Go backend API for the Tindahan (Filipino Store) application using Clean Architecture.

## 🏗️ Project Structure

```
backend/
├── api/
│   ├── controller/     # HTTP handlers
│   ├── middleware/     # JWT auth, CORS, etc.
│   └── route/          # Route definitions
├── bootstrap/          # App initialization, env loading
├── cmd/               # Main application entry point
├── domain/            # Business entities and DTOs
├── internal/          # Internal utilities (JWT, etc.)
├── mongo/             # Database connection
├── repository/        # Data access layer
├── usecase/           # Business logic layer
├── docker-compose.yaml
├── Dockerfile
├── go.mod
└── .env
```

## 🚀 Features

- **Authentication**: JWT-based auth with access/refresh tokens
- **User Management**: Signup, login, profile management
- **Store Management**: CRUD operations for stores
- **Product Management**: CRUD operations for products
- **Search**: Location-based store and product search
- **Role-based Access**: Owner, Customer, Admin roles
- **Clean Architecture**: Separated concerns with proper layers

## 📋 Prerequisites

- Go 1.21+
- MongoDB 7.0+
- Docker & Docker Compose (optional)

## 🛠️ Installation

### 1. Clone and Setup
```bash
cd backend
go mod tidy
```

### 2. Environment Variables
Copy `.env` file and update as needed:
```bash
cp .env.example .env
```

### 3. Database Setup
**Option 1: Local MongoDB**
```bash
# Install and start MongoDB locally
mongod
```

**Option 2: Docker**
```bash
docker-compose up mongodb
```

### 4. Run the Application
```bash
# Run directly
go run cmd/main.go

# Or with Docker
docker-compose up
```

## 🗂️ API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token

### Public Routes
- `GET /api/v1/stores` - Search stores (location-based)
- `GET /api/v1/stores/:id` - Get store by ID
- `GET /api/v1/products` - Search products
- `GET /api/v1/products/:id` - Get product by ID

### Protected Routes (JWT Required)
- `GET /api/v1/user/profile` - Get user profile
- `PUT /api/v1/user/profile` - Update user profile

### Store Owner Routes
- `POST /api/v1/stores` - Create store
- `PUT /api/v1/stores/:id` - Update store
- `DELETE /api/v1/stores/:id` - Delete store
- `GET /api/v1/my-stores` - Get my stores
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `GET /api/v1/my-products` - Get my products

### Admin Routes
- `GET /api/v1/users` - Get all users
- `PUT /api/v1/users/:id/status` - Update user status

## 🔧 Development

### Adding New Endpoints
1. Define domain models in `domain/`
2. Create repository in `repository/`
3. Create use case in `usecase/`
4. Create controller in `api/controller/`
5. Add routes in `api/route/`

### Running Tests
```bash
go test ./...
```

### Building for Production
```bash
go build -o tindahan-api cmd/main.go
```

## 🐳 Docker Commands

```bash
# Build image
docker build -t tindahan-api .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "password": "string (hashed)",
  "phone": "string",
  "role": "owner|customer|admin",
  "is_active": "boolean",
  "created_at": "Date",
  "updated_at": "Date"
}
```

### Stores Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "address": "string",
  "city": "string",
  "latitude": "number",
  "longitude": "number",
  "owner_id": "ObjectId",
  "category": "string",
  "rating": "number",
  "is_active": "boolean",
  "created_at": "Date",
  "updated_at": "Date"
}
```

### Products Collection
```json
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

## 🔒 Authentication

The API uses JWT tokens for authentication:
- **Access Token**: 24 hours expiry
- **Refresh Token**: 7 days expiry

Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## 🌐 CORS

CORS is configured to allow requests from:
- http://localhost:3000 (React dev server)
- http://localhost:5173 (Vite dev server)

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | 8080 | Server port |
| `MONGO_URI` | mongodb://localhost:27017 | MongoDB connection string |
| `MONGO_DB_NAME` | tindahan_db | Database name |
| `JWT_SECRET` | tindahan-secret-key | JWT signing secret |

## 🚨 Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Validate all input data
- Implement rate limiting
- Use environment variables for sensitive data
