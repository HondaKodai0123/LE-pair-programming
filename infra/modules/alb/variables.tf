variable "name" {}
variable "subnets" { type = list(string) }
variable "security_groups" { type = list(string) }
variable "vpc_id" {}
variable "acm_certificate_arn" {}
variable "target_id" {}
variable "target_port" { default = 80 }
variable "tags" {
  type    = map(string)
  default = {}
}

