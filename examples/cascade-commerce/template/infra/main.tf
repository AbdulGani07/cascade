terraform {
  required_version = ">= 1.8.0"
}

variable "environment" {
  type    = string
  default = "demo"
}
