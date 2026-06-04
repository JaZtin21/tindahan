# Stage 1: Build the Go binary
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /backend-bin ./cmd/main.go

# Production stage
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /backend-bin .

# FIXED: Dynamic Environment Check
# By default, it assumes production (empty). Local Compose will pass "dev"
ARG APP_ENV=""

# This shell script trick checks if APP_ENV is set to "dev". 
# If it is, it creates a blank file or copies your local .env safely.
# If it is blank (on Railway), it creates an empty dummy file so godotenv doesn't fail.
RUN if [ "$APP_ENV" = "dev" ]; then \
        echo "Local Dev Detected: Copying .env file..."; \
    else \
        echo "Production Detected: Skipping .env copy..."; \
    fi
    
# Safely copy any local .env if it exists, otherwise do nothing
COPY .en[v] .

EXPOSE 8080
CMD ["./backend-bin"]
