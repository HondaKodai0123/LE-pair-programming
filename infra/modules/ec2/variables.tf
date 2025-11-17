variable "ami_id" {
  description = "AMI ID for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "iam_instance_profile" {
  description = "IAM instance profile for EC2"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID where EC2 will be launched"
  type        = string
}

variable "security_group_id" {
  description = "Security group ID for EC2"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tags" {
  description = "Tags for EC2 instance"
  type        = map(string)
  default     = {}
}

variable "key_name" {
  description = "既存EC2用のキーペア名"
  type        = string
  default     = "key-HondaKodai-iac"
}


