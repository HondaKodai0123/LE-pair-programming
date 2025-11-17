variable "project_name" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ALB用ACM証明書ARN"
  type        = string
}

variable "db_username" {
  description = "RDSユーザー名"
  type        = string
}

variable "db_name" {
  description = "RDSデータベース名"
  type        = string
}

variable "db_password" {
  description = "RDSパスワード"
  type        = string
  sensitive   = true
}

variable "key_name" {
  description = "既存EC2用のキーペア名"
  type        = string
  default     = "key-HondaKodai-iac"
}


