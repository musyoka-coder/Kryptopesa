FROM node:24.22.1-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json ./web/
RUN npm ci && npm ci --prefix web
COPY . .
ARG PUBLIC_SUPABASE_URL=https://fixture.supabase.co
ARG PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ci_fixture
RUN npm run build:all

FROM golang:1.27.4-bookworm AS api
WORKDIR /app
COPY go.mod ./
COPY pkg ./pkg
COPY cmd ./cmd
RUN CGO_ENABLED=0 go build -trimpath -o /server ./cmd/server

FROM scratch
COPY --from=api /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=api /server /server
COPY --from=web /app/dist /dist
USER 65532:65532
ENV LISTEN_ADDR=0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["/server"]
