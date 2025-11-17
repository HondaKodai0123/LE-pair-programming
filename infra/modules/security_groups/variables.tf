variable "project_name" {
  description = "プロジェクト名（タグ付けや命名に使用）"
  type        = string
}

variable "environment" {
  description = "環境名（例: dev, staging, prod）"
  type        = string
}

variable "vpc_id" {
  description = "セキュリティグループを作成するVPCのID"
  type        = string
}
