package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestLoggingRecordsResponseFields(t *testing.T) {
	core, logs := observer.New(zap.InfoLevel)
	logger := zap.New(core)
	handler := Logging(logger, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions?secret=hidden", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusCreated || logs.Len() != 1 {
		t.Fatalf("status = %d, logs = %d", response.Code, logs.Len())
	}
	fields := logs.All()[0].ContextMap()
	if fields["method"] != http.MethodPost || fields["path"] != "/v1/chat/completions" || fields["status"] != int64(http.StatusCreated) {
		t.Fatalf("unexpected fields: %#v", fields)
	}
	if _, ok := fields["duration"]; !ok {
		t.Fatal("duration field missing")
	}
}

func TestLoggingPreservesStreamingFlush(t *testing.T) {
	core, logs := observer.New(zap.InfoLevel)
	logger := zap.New(core)
	handler := Logging(logger, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatal("streaming writer does not implement http.Flusher")
		}
		_, _ = w.Write([]byte("data: test\n\n"))
		flusher.Flush()
	}))

	request := httptest.NewRequest(http.MethodGet, "/stream", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK || response.Body.String() != "data: test\n\n" || logs.Len() != 1 {
		t.Fatalf("status = %d, body = %q, logs = %d", response.Code, response.Body.String(), logs.Len())
	}
}
