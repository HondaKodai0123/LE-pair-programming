terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "le-training-tfstate-qj5m90he"
    key     = "training/honda/terraform.tfstate"
    region  = "ap-northeast-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ---------------------------
# VPC モジュール
# ---------------------------
module "vpc" {
  source       = "../../modules/vpc"
  project_name = var.project_name
  environment  = var.environment
}

# ---------------------------
# Security Groups
# ---------------------------
module "security_groups" {
  source       = "../../modules/security_groups"
  vpc_id       = module.vpc.vpc_id
  project_name = var.project_name
  environment  = var.environment
}

# ---------------------------
# IAM
# ---------------------------
module "iam" {
  source       = "../../modules/iam"
  project_name = var.project_name
  environment  = var.environment
}

# ---------------------------
# EC2
# ---------------------------
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# 既存EC2（既存キーペア使用）
module "ec2" {
  source               = "../../modules/ec2"
  ami_id               = data.aws_ami.amazon_linux_2023.id
  instance_type        = "t3.micro"
  iam_instance_profile = module.iam.ec2_instance_profile_name
  subnet_id            = module.vpc.public_subnet_ids[0]
  security_group_id    = module.security_groups.ec2_sg_id
  key_name             = "key-HondaKodai-iac"
  project_name         = var.project_name
  environment          = var.environment
  tags = {
    Name = "${var.project_name}-ec2"
  }
}

# ---------------------------
# ALB
# ---------------------------
module "alb" {
  source              = "../../modules/alb"
  name                = "${var.project_name}-alb"
  subnets             = module.vpc.public_subnet_ids
  security_groups     = [module.security_groups.alb_sg_id]
  vpc_id              = module.vpc.vpc_id
  acm_certificate_arn = var.acm_certificate_arn
  target_id           = module.ec2.wordpress_instance_id
  target_port         = 80
  tags = {
    Name        = "${var.project_name}-alb"
    Environment = var.environment
  }
}

# ---------------------------
# RDS
# ---------------------------
module "rds" {
  source     = "../../modules/rds"
  name       = "${var.project_name}-rds"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  ec2_sg_id  = module.security_groups.ec2_sg_id
  db_name    = var.db_name
  db_username = var.db_username
  db_password = var.db_password
  environment    = var.environment
  project_name = var.project_name

  # タグ（最低限）
  tags = {
    Name = "${var.project_name}-rds"
  }
}
