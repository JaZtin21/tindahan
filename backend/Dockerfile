# Stage 1: Compile the Go Executable Binary securely
FROM golang:1.25-alpine AS builder
WORKDIR /app

# 1. Pull down your backend workspace files
COPY . .

# 2. Verify and establish the module system structures dynamically
RUN if [ ! -f "go.mod" ]; then \
        echo "=== [AUTOFIX] No go.mod found. Initializing module layout..."; \
        go mod init tindahan-backend && go mod tidy; \
    elif grep -q "require" go.mod; then \
        echo "=== [AUTOFIX] External packages detected. Downloading requirements..."; \
        go mod download; \
    else \
        echo "=== [AUTOFIX] Pure standard library project. Skipping download step..."; \
    fi

# 3. FIXED: Changed './cmd/main.go' to './main.go' to match your real file position
RUN CGO_ENABLED=0 GOOS=linux go build -o /backend-bin ./main.go

# ====================================================================
# Stage 2: Minimal Production Runner (Bakes only the absolute essentials)
FROM alpine:latest
WORKDIR /root/

# 4. Copy the compiled binary from the isolated builder stage
COPY --from=builder /backend-bin .

# 5. Dynamic Environment Asset Injection
ARG APP_ENV=""
RUN if [ "$APP_ENV" = "dev" ]; then \
        echo "=== [AUTOFIX] Development Mode: Preparing configuration hooks..."; \
    else \
        echo "=== [AUTOFIX] Production Mode: Relying strictly on Railway Dashboard variables..."; \
    fi

# 6. Wildcard brackets block ensures missing local .env files never crash the cloud builder
COPY .en[v] .

EXPOSE 8080

# 7. Executes the binary file natively inside Process 1
CMD ["./backend-bin"]
