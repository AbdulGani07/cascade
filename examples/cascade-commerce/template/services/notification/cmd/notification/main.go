package main

import (
	"fmt"

	"example.com/cascade-demo/notification/internal/message"
)

func main() {
	fmt.Println(message.OrderReady("order-1042"))
}
