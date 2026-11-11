package handler

import (
	"kryptopesa/pkg/observability"
	"net/http"
)

func Health(w http.ResponseWriter, r *http.Request) {
	observability.Wrap(http.HandlerFunc(observability.Health)).ServeHTTP(w, r)
}
