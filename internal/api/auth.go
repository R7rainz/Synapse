package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/user"
)

type Request struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Handler struct {
	users  user.Repository
	tokens *auth.JWTService
}

func NewHandler(users user.Repository, tokens *auth.JWTService) *Handler {
	return &Handler{users: users, tokens: tokens}
}

// http Handlers
func (h *Handler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON Body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 8 {
		http.Error(w, "Password must be at least 8 characters", http.StatusBadRequest)
		return
	}

	//hash the password
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

	//save to db
	if h.users == nil {
		http.Error(w, "User store is not configured", http.StatusInternalServerError)
		return
	}
	if err := h.users.CreateUser(newUser); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	//write header
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User successfully registered",
		"user":    newUser,
	})
}

func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	//fetch user from db
	if h.users == nil {
		http.Error(w, "User store is not configured", http.StatusInternalServerError)
		return
	}
	currentUser, err := h.users.GetUserByEmail(req.Email)
	if err != nil {
		http.Error(w, "Invalid JSON Body", http.StatusBadRequest)
		return
	}

	//Compare bcrypt hashes
	if !auth.CheckPasswordHash(req.Password, currentUser.PasswordHash) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	//generate access token
	tokenString, err := h.tokens.Generate(currentUser.ID)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": tokenString,
		"token_type":   "Bearer",
	})
}
