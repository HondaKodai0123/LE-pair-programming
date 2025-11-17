# ---------------------------
# 既存EC2 出力
# ---------------------------
output "wordpress_instance_id" {
  description = "WordPress EC2インスタンスID"
  value       = aws_instance.web.id
}

output "wordpress_private_ip" {
  description = "Private IP of WordPress EC2 instance"
  value       = aws_instance.web.private_ip
}

output "wordpress_public_ip" {
  description = "Public IP of WordPress EC2 instance"
  value       = aws_instance.web.public_ip
}

