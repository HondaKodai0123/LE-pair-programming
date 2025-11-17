output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_arn" {
  value = module.alb.alb_arn
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "target_group_arn" {
  value = module.alb.target_group_arn
}

# 既存EC2
output "wordpress_instance_id" {
  value = module.ec2.wordpress_instance_id
}


