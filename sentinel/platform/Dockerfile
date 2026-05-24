FROM golang:1.23-alpine AS builder
ENV GOPROXY=https://goproxy.cn,https://goproxy.io,direct
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o sentinel ./cmd/server

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/sentinel .
EXPOSE 8082
CMD ["./sentinel"]
