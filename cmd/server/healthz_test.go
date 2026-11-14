package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth(t *testing.T) {
	mux := newMux(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Fatal("health consulted account upstream") }))
	for _, tc := range []struct {
		method string
		status int
	}{{"GET", 200}, {"HEAD", 200}, {"POST", 405}} {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequest(tc.method, "/healthz", nil))
		if w.Code != tc.status {
			t.Fatalf("%s: %d", tc.method, w.Code)
		}
		if tc.method == "GET" && w.Body.String() != `{"status":"ok"}` {
			t.Fatal(w.Body.String())
		}
	}
}
func TestAccountRoute(t *testing.T) {
	mux := newMux(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(401) }))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("GET", "/api/account", nil))
	if w.Code != 401 {
		t.Fatal(w.Code)
	}
}
