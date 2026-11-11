// Package observability records bounded, non-sensitive request diagnostics.
package observability

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"os"
	"time"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

type response struct {
	http.ResponseWriter
	status int
}

func (w *response) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
		w.ResponseWriter.WriteHeader(status)
	}
}
func (w *response) Write(p []byte) (int, error) {
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(p)
}

// Wrap never logs URLs, headers, bodies, user identifiers or upstream errors.
// Request IDs are generated locally rather than trusted from incoming headers.
func Wrap(next http.Handler) http.Handler { return WithLogger(next, logger) }
func WithLogger(next http.Handler, log *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := make([]byte, 16)
		if _, err := rand.Read(id); err != nil {
			http.Error(w, "Service unavailable", 503)
			return
		}
		requestID := hex.EncodeToString(id)
		w.Header().Set("X-Request-ID", requestID)
		started := time.Now()
		rw := &response{ResponseWriter: w}
		defer func() {
			if recovered := recover(); recovered != nil {
				if rw.status == 0 {
					http.Error(rw, "Service unavailable", 500)
				}
				log.Error("request_panic", "request_id", requestID)
			}
			if rw.status == 0 {
				rw.WriteHeader(http.StatusOK)
			}
			log.Info("http_request", "request_id", requestID, "status", rw.status, "duration_ms", time.Since(started).Milliseconds())
		}()
		next.ServeHTTP(rw, r)
	})
}

// Health is liveness only; it does not claim provider or database readiness.
func Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		w.WriteHeader(405)
		_, _ = w.Write([]byte(`{"error":"method_not_allowed"}`))
		return
	}
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
