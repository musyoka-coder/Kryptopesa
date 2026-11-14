package main

import (
	"context"
	"errors"
	"flag"
	"kryptopesa/pkg/account"
	"kryptopesa/pkg/observability"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, nil)))
	local := flag.Bool("local-upstream", false, "allow loopback-only fixture upstream (development only)")
	flag.Parse()
	newAccount := account.New
	if *local {
		newAccount = account.NewLocal
	}
	h, err := newAccount(account.Config{SupabaseURL: os.Getenv("PUBLIC_SUPABASE_URL"), PublicKey: os.Getenv("PUBLIC_SUPABASE_ANON_KEY")})
	if err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
	mux := newMux(h)
	addr := os.Getenv("LISTEN_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}
	server := &http.Server{Addr: addr, Handler: observability.Wrap(mux), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16384}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}

// Health reports process liveness only, without consulting Supabase.
func newMux(accountHandler http.Handler) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("/api/account", accountHandler)
	mux.HandleFunc("/api/health", observability.Health)
	mux.Handle("/", http.FileServer(http.Dir("dist")))
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	return mux
}
