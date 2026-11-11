package handler

import (
	"kryptopesa/pkg/account"
	"net/http"
	"os"
)

// Handler is the Vercel Go function entry point. No service-role credential is used.
func Handler(w http.ResponseWriter, r *http.Request) {
	h, err := account.New(account.Config{SupabaseURL: os.Getenv("PUBLIC_SUPABASE_URL"), PublicKey: os.Getenv("PUBLIC_SUPABASE_ANON_KEY")})
	if err != nil {
		w.Header().Set("Cache-Control", "no-store")
		http.Error(w, "Service configuration unavailable", http.StatusServiceUnavailable)
		return
	}
	h.ServeHTTP(w, r)
}
