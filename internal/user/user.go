package user

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // omit PasswordHash from json responses
	CreatedAt    time.Time `json:"created_at"`
}
