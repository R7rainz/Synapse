package main

import (
	"fmt"
	"net/http"
)

func main() {

	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Hey there how are you doing this is the health point")
	})

	http.ListenAndServe(":1234", nil)
}
