# IAMモジュール用変数定義ファイル

variable "project_name" {
  type        = string
  description = "プロジェクト名（リソース名に使用）"
}

variable "environment" {
  type        = string
  description = "環境名（dev/stg/prod など）"
}
