package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
	"github.com/r7rainz/synapse/internal/user"
)

type Request struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Handler struct {
	users      user.Repository
	key        apikey.Repository
	tokens     *auth.JWTService
	gateway    *gateway.Client
	llmrequest llmrequest.Repository
	provider   string
}

func NewHandler(users user.Repository, key apikey.Repository, tokens *auth.JWTService, gateway *gateway.Client, requests llmrequest.Repository, provider string) *Handler {
	return &Handler{users: users, key: key, tokens: tokens, gateway: gateway, llmrequest: requests, provider: provider}
}

func (h *Handler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	var req Request
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON Body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 8 || len(req.Password) > 72 {
		http.Error(w, "Password must be 8-72 bytes", http.StatusBadRequest)
		return
	}

	// hash the password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	newUser := &user.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		CreatedAt:    time.Now(),
	}

	// save to db
	if h.users == nil {
		http.Error(w, "User store is not configured", http.StatusInternalServerError)
		return
	}
	if err := h.users.CreateUser(r.Context(), newUser); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// write header
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"message": "User successfully registered",
		"user":    newUser,
	})
}

func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req Request
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	// fetch user from db
	if h.users == nil {
		http.Error(w, "User store is not configured", http.StatusInternalServerError)
		return
	}
	currentUser, err := h.users.GetUserByEmail(r.Context(), req.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Compare bcrypt hashes
	if !auth.CheckPasswordHash(req.Password, currentUser.PasswordHash) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// generate access token
	tokenString, err := h.tokens.Generate(currentUser.ID)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"access_token": tokenString,
		"token_type":   "Bearer",
	})
}
