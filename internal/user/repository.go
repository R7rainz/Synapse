package user

import "context"

type Repository interface {
	CreateUser(context.Context, *User) error
	GetUserByEmail(context.Context, string) (*User, error)
}
