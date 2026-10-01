package apikey

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
)

func GenerateAPIKey() (rawKey, keyPrefix, keyHash string, err error) {
	secret := make([]byte, 32)
	if _, err = rand.Read(secret); err != nil {
		return "", "", "", err
	}

	rawKey = "sk_" + base64.RawURLEncoding.EncodeToString(secret)
	keyPrefix = rawKey[:11]

	keyHash = HashAPIKey(rawKey)

	return rawKey, keyPrefix, keyHash, nil
}

func HashAPIKey(rawKey string) string {
	hash := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(hash[:])
}
