package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/r7rainz/synapse/internal/auth"
)

type fakeDatabasePinger struct {
	err error
}

func (p fakeDatabasePinger) Ping(context.Context) error {
	return p.err
}

type blockingDatabasePinger struct{}

func (blockingDatabasePinger) Ping(ctx context.Context) error {
	<-ctx.Done()
	return ctx.Err()
}

func TestHealthIsPublic(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	response := httptest.NewRecorder()

	(&Handler{auth: &auth.Verifier{}}).Routes().ServeHTTP(response, request)

	if response.Code != http.StatusOK || response.Body.String() != "{\"status\":\"ok\"}\n" {
		t.Fatalf("status = %d, body = %q", response.Code, response.Body.String())
	}
}

func TestReadiness(t *testing.T) {
	tests := []struct {
		name     string
		database DatabasePinger
		wantCode int
		wantBody string
	}{
		{name: "ready", database: fakeDatabasePinger{}, wantCode: http.StatusOK, wantBody: "{\"status\":\"ready\"}\n"},
		{name: "database failure", database: fakeDatabasePinger{err: errors.New("database unavailable")}, wantCode: http.StatusServiceUnavailable, wantBody: "{\"status\":\"not_ready\"}\n"},
		{name: "database missing", wantCode: http.StatusServiceUnavailable, wantBody: "{\"status\":\"not_ready\"}\n"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			handler := &Handler{database: test.database}
			request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
			response := httptest.NewRecorder()

			handler.HandleReadiness(response, request)

			if response.Code != test.wantCode || response.Body.String() != test.wantBody {
				t.Fatalf("status = %d, body = %q", response.Code, response.Body.String())
			}
		})
	}
}

func TestReadinessTimesOut(t *testing.T) {
	previousTimeout := readinessTimeout
	readinessTimeout = time.Millisecond
	t.Cleanup(func() { readinessTimeout = previousTimeout })

	handler := &Handler{database: blockingDatabasePinger{}}
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()

	handler.HandleReadiness(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
}
