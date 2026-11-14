FROM golang:1.27.4-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY pkg ./pkg
COPY cmd/server ./cmd/server
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.23
RUN apk add --no-cache ca-certificates
COPY --from=build /out/server /usr/local/bin/kryptopesa-api
USER 65532:65532
ENV LISTEN_ADDR=0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["kryptopesa-api"]
