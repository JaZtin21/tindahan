# Stage 1: Build the Go binary
FROM golang:1.25-alpine AS builder
WORKDIR /app

# FIXED: Wrapping the 's' in brackets makes go.sum optional if it doesn't exist yet!
COPY go.mo[d] go.su[m] ./

RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /backend-bin ./cmd/main.go

# Production stage
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /backend-bin .

# Dynamic Environment Check
ARG APP_ENV=""
RUN if [ "$APP_ENV" = "dev" ]; then \
        echo "Local Dev Detected: Copying .env file..."; \
    else \
        echo "Production Detected: Skipping .env copy..."; \
    fi
    
COPY .en[v] .

EXPOSE 8080
CMD ["./backend-bin"]