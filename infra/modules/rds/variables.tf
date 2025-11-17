variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "name" {
  description = "Name prefix for RDS resources"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for RDS subnet group"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID for RDS"
  type        = string
}

variable "ec2_sg_id" {
  description = "Security Group ID that allows EC2 access to RDS"
  type        = string
}

variable "db_name" {
  description = "Databasename for the RDS database"
  type        = string
}

variable "db_username" {
  description = "Username for the RDS database"
  type        = string
}

variable "db_password" {
  description = "Password for the RDS database"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Deployment environment name (e.g., dev, stg, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags for RDS resources"
  type        = map(string)
  default     = {}
}
