# ---------------------------
# 既存EC2
# ---------------------------
resource "aws_instance" "web" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  iam_instance_profile   = var.iam_instance_profile
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]
  key_name               = var.key_name
  tags                   = var.tags
}
