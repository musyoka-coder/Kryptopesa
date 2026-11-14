package observability

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDiagnostics(t *testing.T) {
	for _, panicNow := range []bool{false, true} {
		var logs bytes.Buffer
		h := WithLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if panicNow {
				panic("sensitive panic content")
			}
			w.WriteHeader(403)
			_, _ = w.Write([]byte("denied"))
		}), slog.New(slog.NewJSONHandler(&logs, nil)))
		r := httptest.NewRequest("GET", "/api/account?token=sensitive-query", nil)
		r.Header.Set("Authorization", "Bearer sensitive-token")
		r.Header.Set("X-Request-ID", "untrusted-id")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		expected := 403
		if panicNow {
			expected = 500
		}
		if w.Code != expected {
			t.Fatal(w.Code)
		}
		id := w.Header().Get("X-Request-ID")
		if len(id) != 32 {
			t.Fatal(id)
		}
		if !strings.Contains(logs.String(), id) {
			t.Fatal("missing correlation")
		}
		for _, secret := range []string{"sensitive-query", "sensitive-token", "untrusted-id", "sensitive panic content"} {
			if strings.Contains(logs.String(), secret) {
				t.Fatal("private data logged")
			}
		}
	}
}
func TestHealth(t *testing.T) {
	for _, method := range []string{"GET", "POST"} {
		w := httptest.NewRecorder()
		Wrap(http.HandlerFunc(Health)).ServeHTTP(w, httptest.NewRequest(method, "/api/health", nil))
		if w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("cached health")
		}
		if method == "GET" && (w.Code != 200 || w.Body.String() != `{"status":"ok"}`) {
			t.Fatal(w.Body.String())
		}
		if method == "POST" && (w.Code != 405 || w.Header().Get("Allow") != "GET") {
			t.Fatal(w.Code)
		}
	}
}
func TestEmptyHandler(t *testing.T) {
	var logs bytes.Buffer
	w := httptest.NewRecorder()
	WithLogger(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}), slog.New(slog.NewJSONHandler(&logs, nil))).ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if !strings.Contains(logs.String(), `"status":200`) {
		t.Fatal(logs.String())
	}
}
