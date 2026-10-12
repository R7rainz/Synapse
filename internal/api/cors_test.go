package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	handler := CORS("http://localhost:3000", next)

	t.Run("allows configured origin", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodOptions, "/profile", nil)
		request.Header.Set("Origin", "http://localhost:3000")
		response := httptest.NewRecorder()

		handler.ServeHTTP(response, request)

		if response.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
		}
		if got := response.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
			t.Fatalf("allow origin = %q", got)
		}
	})

	t.Run("rejects other origins", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/profile", nil)
		request.Header.Set("Origin", "https://evil.example.com")
		response := httptest.NewRecorder()

		handler.ServeHTTP(response, request)

		if response.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
		}
	})
}
