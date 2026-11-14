package handler

import (
	"net/http/httptest"
	"testing"
)

func TestAccountAdapter(t *testing.T) {
	for _, configured := range []bool{false, true} {
		t.Setenv("PUBLIC_SUPABASE_URL", "")
		t.Setenv("PUBLIC_SUPABASE_ANON_KEY", "")
		expected := 503
		if configured {
			t.Setenv("PUBLIC_SUPABASE_URL", "https://fixture.supabase.co")
			t.Setenv("PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_fixture")
			expected = 401
		}
		w := httptest.NewRecorder()
		Handler(w, httptest.NewRequest("GET", "/api/account", nil))
		if w.Code != expected {
			t.Fatal(w.Code)
		}
		if w.Header().Get("X-Request-ID") == "" || w.Header().Get("Cache-Control") == "" {
			t.Fatal("missing diagnostics or cache control")
		}
	}
}
func TestHealthAdapter(t *testing.T) {
	w := httptest.NewRecorder()
	Health(w, httptest.NewRequest("GET", "/api/health", nil))
	if w.Code != 200 {
		t.Fatal(w.Code)
	}
}
