package user

type Repository interface {
	CreateUser(*User) error
	GetUserByEmail(string) (*User, error)
}
