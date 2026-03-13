# GraphQL Integration Guide

## Installation
```bash
# Install gqlgen CLI
go install github.com/99designs/gqlgen@latest

# Add to project
go get github.com/99designs/gqlgen/graphql/handler
go get github.com/99designs/gqlgen/graphql/playground
```

## Setup Commands
```bash
# Generate GraphQL code
go run github.com/99designs/gqlgen generate

# Start development server
go run cmd/main.go
```

## Add to Route
```go
// In api/route/route.go
import "github.com/99designs/gqlgen/graphql/handler"
import "github.com/99designs/gqlgen/graphql/playground"

// Add GraphQL routes
graphqlHandler := handler.NewDefaultServer(graphql.NewExecutableSchema(graphql.Config{Resolvers: &graphql.Resolver{}}))
playgroundHandler := playground.Handler("GraphQL Playground", "/query")

router.GET("/query", playgroundHandler)
router.POST("/query", graphqlHandler)
```

## Benefits
1. **Single Endpoint** - All data through /graphql
2. **Type Safety** - Auto-generated Go types
3. **No Over/Under Fetching** - Clients request exactly what they need
4. **Real-time** - Easy to add subscriptions later
5. **Introspection** - Self-documenting API

## Frontend Integration
```javascript
// React/Apollo Client query example
const GET_STORES = gql`
  query GetStores($search: String, $category: String) {
    stores(search: $search, category: $category) {
      id
      name
      address
      latitude
      longitude
      products {
        id
        name
        price
      }
    }
  }
`;
```

## Migration Strategy
1. **Phase 1**: Add GraphQL alongside existing REST API
2. **Phase 2**: Migrate frontend to use GraphQL for new features
3. **Phase 3**: Gradually deprecate REST endpoints
4. **Phase 4**: Full GraphQL (optional)
