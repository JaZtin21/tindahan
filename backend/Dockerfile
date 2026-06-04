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

# COPY THE ENV FILE HERE SO GODOTENV CAN FIND IT INSIDE DOCKER
COPY .env .

EXPOSE 8080
CMD ["./backend-bin"]