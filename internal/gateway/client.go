package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"strconv"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("LLM provider is not configured")

const (
	maxProviderErrorBodySize = 1 << 20
	maxRetryAfter            = 2 * time.Second
)

type ProviderError struct {
	StatusCode int
	Code       string
	RequestID  string
	RetryAfter string
	Header     http.Header
	errorType  string
}

func (e *ProviderError) Error() string {
	return fmt.Sprintf("LLM provider returned status %d (code %q)", e.StatusCode, e.Code)
}

func (e *ProviderError) IsQuotaExceeded() bool {
	switch e.Code {
	case "credit_balance_exhausted", "organization_usage_limit_exceeded", "organization_spend_limit_exceeded", "project_spend_limit_exceeded", "insufficient_quota":
		return true
	default:
		return e.errorType == "insufficient_quota"
	}
}

type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewClient(baseURL, apiKey string) *Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = 30 * time.Second

	return &Client{
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     apiKey,
		httpClient: &http.Client{Transport: transport},
	}
}

func (c *Client) ChatCompletions(ctx context.Context, body []byte, stream bool) (*http.Response, error) {
	return c.do(ctx, "/chat/completions", body, !stream)
}

func (c *Client) Embeddings(ctx context.Context, model string, inputs []string) ([][]float64, error) {
	body, err := json.Marshal(struct {
		Model string   `json:"model"`
		Input []string `json:"input"`
	}{Model: model, Input: inputs})
	if err != nil {
		return nil, err
	}

	response, err := c.do(ctx, "/embeddings", body, true)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	var result struct {
		Data []struct {
			Index     int       `json:"index"`
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 16<<20)).Decode(&result); err != nil {
		return nil, err
	}
	if len(result.Data) != len(inputs) {
		return nil, fmt.Errorf("embedding provider returned %d embeddings, want %d", len(result.Data), len(inputs))
	}

	embeddings := make([][]float64, len(inputs))
	for _, item := range result.Data {
		if item.Index < 0 || item.Index >= len(inputs) || embeddings[item.Index] != nil {
			return nil, fmt.Errorf("embedding provider returned invalid indexes")
		}
		embeddings[item.Index] = item.Embedding
	}

	for i, embedding := range embeddings {
		if len(embedding) != 1536 {
			return nil, fmt.Errorf("embedding %d has %d dimensions, want 1536", i, len(embedding))
		}
	}

	return embeddings, nil
}

func (c *Client) do(ctx context.Context, path string, body []byte, retry bool) (*http.Response, error) {
	if c.baseURL == "" {
		return nil, ErrNotConfigured
	}

	for attempt := 0; attempt < 2; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		if c.apiKey != "" {
			req.Header.Set("Authorization", "Bearer "+c.apiKey)
		}
		req.Header.Set("Content-Type", "application/json")

		response, err := c.httpClient.Do(req)
		if err != nil {
			if !retry || attempt == 1 || ctx.Err() != nil {
				return nil, err
			}
			if err := waitForRetry(ctx, retryBackoff()); err != nil {
				return nil, err
			}
			continue
		}
		if response.StatusCode >= http.StatusOK && response.StatusCode < http.StatusMultipleChoices {
			return response, nil
		}

		providerErr := readProviderError(response)
		if !retry || attempt == 1 || !providerErr.retryable() {
			return nil, providerErr
		}
		delay, ok := providerErr.retryDelay()
		if !ok {
			return nil, providerErr
		}
		if err := waitForRetry(ctx, delay); err != nil {
			return nil, err
		}
	}

	return nil, errors.New("LLM provider retry exhausted")
}

func readProviderError(response *http.Response) *ProviderError {
	defer response.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(response.Body, maxProviderErrorBodySize))

	var payload struct {
		Error struct {
			Type string `json:"type"`
			Code string `json:"code"`
		} `json:"error"`
	}
	_ = json.Unmarshal(body, &payload)

	return &ProviderError{
		StatusCode: response.StatusCode,
		Code:       payload.Error.Code,
		RequestID:  response.Header.Get("X-Request-ID"),
		RetryAfter: response.Header.Get("Retry-After"),
		Header:     safeProviderHeaders(response.Header),
		errorType:  payload.Error.Type,
	}
}

func (e *ProviderError) retryable() bool {
	return e.StatusCode == http.StatusServiceUnavailable || (e.StatusCode == http.StatusTooManyRequests && !e.IsQuotaExceeded())
}

func (e *ProviderError) retryDelay() (time.Duration, bool) {
	if e.RetryAfter == "" {
		return retryBackoff(), true
	}

	var delay time.Duration
	seconds, err := strconv.Atoi(e.RetryAfter)
	if err == nil {
		delay = time.Duration(seconds) * time.Second
	} else if retryAt, dateErr := http.ParseTime(e.RetryAfter); dateErr == nil {
		delay = time.Until(retryAt)
	} else {
		return retryBackoff(), true
	}
	if delay < 0 {
		delay = 0
	}
	return delay, delay <= maxRetryAfter
}

func retryBackoff() time.Duration {
	return 250*time.Millisecond + time.Duration(rand.IntN(251))*time.Millisecond
}

func waitForRetry(ctx context.Context, delay time.Duration) error {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func safeProviderHeaders(source http.Header) http.Header {
	headers := make(http.Header)
	for _, name := range []string{"Retry-After", "X-Request-ID"} {
		for _, value := range source.Values(name) {
			headers.Add(name, value)
		}
	}
	for name, values := range source {
		if !strings.HasPrefix(strings.ToLower(name), "x-ratelimit-") {
			continue
		}
		for _, value := range values {
			headers.Add(name, value)
		}
	}
	return headers
}
