############################################
# RDS Outputs
############################################

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.this.endpoint
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.this.port
}
