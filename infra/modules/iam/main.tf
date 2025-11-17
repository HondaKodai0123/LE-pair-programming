############################################
# EC2 用 IAM Role
############################################
resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-ec2-role"
    Environment = var.environment
  }
}

############################################
# SSM Session Manager 用ポリシーをアタッチ
############################################
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

############################################
# S3 読み取り専用ポリシー（WordPressなど用）
############################################
resource "aws_iam_role_policy" "ec2_s3_read" {
  name = "${var.project_name}-ec2-s3-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-*",
          "arn:aws:s3:::${var.project_name}-*/*"
        ]
      }
    ]
  })
}

############################################
# Instance Profile（EC2 に Role を紐付け）
############################################
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

############################################
# EC2 用 RDS 読み取りポリシー（Describe 用）
############################################
resource "aws_iam_role_policy" "ec2_rds_read" {
  name = "${var.project_name}-ec2-rds-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBSubnetGroups"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_ec2_read" {
  name = "${var.project_name}-ec2-ec2-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

############################################
# EC2 用 ALB 読み取りポリシー（Describe 用）
############################################
resource "aws_iam_role_policy" "ec2_elb_read" {
  name = "${var.project_name}-ec2-elb-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetHealth"
        ]
        Resource = "*"
      }
    ]
  })
}
