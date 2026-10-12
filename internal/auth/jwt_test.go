package auth

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestVerifier(t *testing.T) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}

	jwks := fmt.Sprintf(`{"keys":[{"kty":"OKP","crv":"Ed25519","x":"%s","use":"sig","kid":"test","alg":"EdDSA"}]}`,
		base64.RawURLEncoding.EncodeToString(publicKey))
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(jwks))
	}))
	defer server.Close()

	verifier, err := NewVerifier(context.Background(), server.URL, "https://auth.example.com", "synapse-api")
	if err != nil {
		t.Fatal(err)
	}

	sign := func(claims jwt.RegisteredClaims) string {
		t.Helper()
		token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
		token.Header["kid"] = "test"
		signed, err := token.SignedString(privateKey)
		if err != nil {
			t.Fatal(err)
		}
		return signed
	}

	validClaims := jwt.RegisteredClaims{
		Subject:   "dcefc351-de81-4e88-85b6-223c4c9e878a",
		Issuer:    "https://auth.example.com",
		Audience:  jwt.ClaimStrings{"synapse-api"},
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
	}

	t.Run("accepts a valid token", func(t *testing.T) {
		claims, err := verifier.Parse(sign(validClaims))
		if err != nil {
			t.Fatal(err)
		}
		if claims.Subject != validClaims.Subject {
			t.Fatalf("subject = %q, want %q", claims.Subject, validClaims.Subject)
		}
	})

	tests := []struct {
		name   string
		change func(*jwt.RegisteredClaims)
	}{
		{"missing subject", func(c *jwt.RegisteredClaims) { c.Subject = "" }},
		{"wrong issuer", func(c *jwt.RegisteredClaims) { c.Issuer = "https://other.example.com" }},
		{"wrong audience", func(c *jwt.RegisteredClaims) { c.Audience = jwt.ClaimStrings{"other-api"} }},
		{"expired", func(c *jwt.RegisteredClaims) { c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Minute)) }},
	}

	for _, test := range tests {
		t.Run("rejects "+test.name, func(t *testing.T) {
			claims := validClaims
			test.change(&claims)
			if _, err := verifier.Parse(sign(claims)); err == nil {
				t.Fatal("expected token validation to fail")
			}
		})
	}
}
