package account

import (
	"errors"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// NewLocal is for the standalone development server only. The Vercel adapter
// always calls New, which continues to require a Supabase HTTPS origin.
func NewLocal(config Config) (*Handler, error) {
	u, err := url.Parse(config.SupabaseURL)
	if err != nil {
		return nil, errors.New("invalid local origin")
	}
	ip := net.ParseIP(u.Hostname())
	if u.Scheme != "http" || ip == nil || !ip.IsLoopback() || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") || config.PublicKey != "local-fixture-key" {
		return nil, errors.New("local mode requires a loopback HTTP origin and fixture key")
	}
	config.SupabaseURL = strings.TrimRight(config.SupabaseURL, "/")
	return &Handler{config: config, client: &http.Client{Timeout: 8 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}
