package handler

import (
	"net/http/httptest"
	"testing"
)

func TestConfigurationUnavailable(t *testing.T) {
	t.Setenv("PUBLIC_SUPABASE_URL", "")
	t.Setenv("PUBLIC_SUPABASE_ANON_KEY", "")
	w := httptest.NewRecorder()
	Handler(w, httptest.NewRequest("GET", "/api/account", nil))
	if w.Code != 503 || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal(w.Code, w.Header())
	}
}
func TestMissingToken(t *testing.T) {
	t.Setenv("PUBLIC_SUPABASE_URL", "https://fixture.supabase.co")
	t.Setenv("PUBLIC_SUPABASE_ANON_KEY", "public")
	w := httptest.NewRecorder()
	Handler(w, httptest.NewRequest("GET", "/api/account", nil))
	if w.Code != 401 {
		t.Fatal(w.Code)
	}
}
