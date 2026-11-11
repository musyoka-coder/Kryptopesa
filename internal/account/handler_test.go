package account

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestAccount(t *testing.T) {
	for _, tc := range []struct {
		name, auth, user, profile       string
		authStatus, profileStatus, want int
	}{
		{"active", "Bearer valid", `{"id":"owner","email_confirmed_at":"2026-01-01"}`, `[{"username":"Nicholus","account_status":"active","kyc_status":"pending"}]`, 200, 200, 200},
		{"missing token", "", `{}`, `[]`, 200, 200, 401},
		{"expired token", "Bearer invalid", `{}`, `[]`, 401, 200, 401},
		{"unconfirmed", "Bearer valid", `{"id":"owner"}`, `[]`, 200, 200, 401},
		{"missing profile", "Bearer valid", `{"id":"owner","email_confirmed_at":"date"}`, `[]`, 200, 200, 403},
		{"suspended", "Bearer valid", `{"id":"owner","email_confirmed_at":"date"}`, `[{"account_status":"suspended"}]`, 200, 200, 403},
		{"upstream failure", "Bearer valid", `{}`, `[]`, 500, 200, 503},
		{"malformed JSON", "Bearer valid", `broken`, `[]`, 200, 200, 503},
		{"RLS failure", "Bearer valid", `{"id":"owner","email_confirmed_at":"date"}`, `[]`, 200, 403, 503},
	} {
		t.Run(tc.name, func(t *testing.T) {
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("Authorization") != tc.auth || r.Header.Get("apikey") != "public" {
					t.Error("upstream credentials missing")
				}
				if r.URL.Path == "/auth/v1/user" {
					w.WriteHeader(tc.authStatus)
					_, _ = w.Write([]byte(tc.user))
					return
				}
				if r.URL.Query().Get("id") != "eq.owner" {
					t.Error("owner filter missing")
				}
				w.WriteHeader(tc.profileStatus)
				_, _ = w.Write([]byte(tc.profile))
			}))
			defer upstream.Close()
			h := &Handler{config: Config{upstream.URL, "public"}, client: upstream.Client()}
			req := httptest.NewRequest("GET", "/api/account?id=someone-else", nil)
			req.Header.Set("Authorization", tc.auth)
			res := httptest.NewRecorder()
			h.ServeHTTP(res, req)
			if res.Code != tc.want {
				t.Fatalf("got %d want %d: %s", res.Code, tc.want, res.Body.String())
			}
			if res.Header().Get("Cache-Control") != "private, no-store" {
				t.Error("private response can be cached")
			}
		})
	}
}
func TestMethods(t *testing.T) {
	h := &Handler{}
	for _, method := range []string{"POST", "PUT", "DELETE", "OPTIONS"} {
		r := httptest.NewRecorder()
		h.ServeHTTP(r, httptest.NewRequest(method, "/api/account", nil))
		if r.Code != 405 {
			t.Fatal(method, r.Code)
		}
	}
}
func TestConfig(t *testing.T) {
	for _, origin := range []string{"http://localhost", "https://evil.example", "https://x.supabase.co/path", "https://x.supabase.co:443"} {
		if _, err := New(Config{origin, "public"}); err == nil {
			t.Fatal(origin)
		}
	}
	if _, err := New(Config{"https://example.supabase.co", "public"}); err != nil {
		t.Fatal(err)
	}
}
func TestTimeout(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() }))
	defer upstream.Close()
	h := &Handler{config: Config{upstream.URL, "public"}, client: &http.Client{Timeout: 10 * time.Millisecond}}
	r := httptest.NewRequest("GET", "/api/account", nil)
	r.Header.Set("Authorization", "Bearer valid")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
}
func TestOversizedToken(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/api/account", nil)
	r.Header.Set("Authorization", "Bearer "+strings.Repeat("x", 8192))
	(&Handler{}).ServeHTTP(w, r)
	if w.Code != 401 {
		t.Fatal(w.Code)
	}
}
