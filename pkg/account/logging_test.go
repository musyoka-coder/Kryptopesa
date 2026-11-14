package account

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLogsExcludeCredentialsAndPersonalData(t *testing.T) {
	var logs bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	defer slog.SetDefault(previous)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/auth/v1/user" {
			_, _ = w.Write([]byte(`{"id":"private-owner","email_confirmed_at":"date"}`))
			return
		}
		w.WriteHeader(500)
		_, _ = w.Write([]byte("private-upstream-error"))
	}))
	defer upstream.Close()
	h := &Handler{config: Config{upstream.URL, "private-key"}, client: upstream.Client()}
	r := httptest.NewRequest("GET", "/api/account?secret=private-query", nil)
	r.Header.Set("Authorization", "Bearer private-token")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
	for _, secret := range []string{"private-owner", "private-key", "private-token", "private-query", "private-upstream-error"} {
		if strings.Contains(logs.String(), secret) {
			t.Fatalf("logged sensitive value %s", secret)
		}
	}
	for _, field := range []string{`"path":"/rest/v1/profiles"`, `"status":500`, `"duration_ms":`, `"code":"account_service_unavailable"`} {
		if !strings.Contains(logs.String(), field) {
			t.Fatalf("missing %s: %s", field, logs.String())
		}
	}
}
