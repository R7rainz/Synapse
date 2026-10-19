package api

import (
	"net/http"
	"time"

	"go.uber.org/zap"
)

func Logging(logger *zap.Logger, next http.Handler) http.Handler {
	if logger == nil {
		logger = nopLogger
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()
		recorder := &loggingResponseWriter{ResponseWriter: w}

		if flusher, ok := w.(http.Flusher); ok {
			next.ServeHTTP(&flushingResponseWriter{loggingResponseWriter: recorder, flusher: flusher}, r)
		} else {
			next.ServeHTTP(recorder, r)
		}

		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}
		logger.Info("http request",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Int("status", status),
			zap.Duration("duration", time.Since(startedAt)),
		)
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
}

func (w *loggingResponseWriter) WriteHeader(status int) {
	if w.status != 0 {
		return
	}
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *loggingResponseWriter) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(body)
}

func (w *loggingResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

type flushingResponseWriter struct {
	*loggingResponseWriter
	flusher http.Flusher
}

func (w *flushingResponseWriter) Flush() {
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	w.flusher.Flush()
}
