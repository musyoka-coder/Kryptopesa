// Package account exposes a read-only, owner-scoped account endpoint.
package account

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Config struct{ SupabaseURL, PublicKey string }
type Handler struct {
	config Config
	client *http.Client
}
type user struct {
	ID        string `json:"id"`
	Confirmed string `json:"email_confirmed_at"`
}
type Profile struct {
	Username      string `json:"username"`
	AccountStatus string `json:"account_status"`
	KYCStatus     string `json:"kyc_status"`
}

func New(config Config) (*Handler, error) {
	u, err := url.Parse(config.SupabaseURL)
	if err != nil || u.Scheme != "https" || !strings.HasSuffix(u.Hostname(), ".supabase.co") || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") || u.Port() != "" || config.PublicKey == "" {
		return nil, errors.New("valid Supabase HTTPS origin and public key required")
	}
	config.SupabaseURL = strings.TrimRight(config.SupabaseURL, "/")
	return &Handler{config: config, client: &http.Client{Timeout: 8 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}
func write(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func fail(w http.ResponseWriter, status int, code string) {
	write(w, status, map[string]string{"error": code})
}
func (h *Handler) get(ctx context.Context, path, token string, target any) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.config.SupabaseURL+path, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("apikey", h.config.PublicKey)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := h.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return resp.StatusCode, nil
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 65537))
	if err != nil {
		return 0, err
	}
	if len(data) > 65536 {
		return 0, errors.New("upstream response too large")
	}
	return resp.StatusCode, json.Unmarshal(data, target)
}
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		fail(w, 405, "method_not_allowed")
		return
	}
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") || len(auth) > 8192 || len(strings.TrimPrefix(auth, "Bearer ")) < 1 {
		fail(w, 401, "unauthorized")
		return
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	if strings.ContainsAny(token, " \t\r\n") {
		fail(w, 401, "unauthorized")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	var identity user
	status, err := h.get(ctx, "/auth/v1/user", token, &identity)
	if err != nil || (status != 200 && status != 401 && status != 403) {
		fail(w, 503, "account_service_unavailable")
		return
	}
	if status != 200 || identity.ID == "" || identity.Confirmed == "" {
		fail(w, 401, "unauthorized")
		return
	}
	// User identity comes exclusively from Auth, never a request parameter.
	q := url.Values{"select": {"username,account_status,kyc_status"}, "id": {"eq." + identity.ID}, "limit": {"1"}}
	var profiles []Profile
	status, err = h.get(ctx, "/rest/v1/profiles?"+q.Encode(), token, &profiles)
	if err != nil || status != 200 {
		fail(w, 503, "account_service_unavailable")
		return
	}
	if len(profiles) != 1 || profiles[0].AccountStatus != "active" {
		fail(w, 403, "account_unavailable")
		return
	}
	write(w, 200, profiles[0])
}
