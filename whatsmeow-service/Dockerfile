FROM golang:1.23-alpine AS builder

WORKDIR /src
RUN apk add --no-cache gcc musl-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/whatsmeow-service .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates libgcc libstdc++ sqlite-libs && \
    addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /out/whatsmeow-service /app/whatsmeow-service
RUN mkdir -p /data && chown -R appuser:appgroup /data /app
USER appuser
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/app/whatsmeow-service"]
