package main

import (
	"example.com/service/internal/log"
	"example.com/shared/client"
)

func main() {
	log.Print(client.Name)
}
