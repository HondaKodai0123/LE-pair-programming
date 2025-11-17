# AWS リソース状況レポート

**作成日**: 2024年11月  
**プロジェクト**: オンライン対戦ポーカー（LE-pair-programming）  
**環境**: training  
**リージョン**: ap-northeast-1 (東京)

---

## 📋 概要

このドキュメントは、`infra/` ディレクトリ内のTerraform構成を分析し、AWS環境作成前に定義されているリソースの状況をまとめたものです。

**注意**: このドキュメントはTerraformコードから読み取った**定義内容**であり、実際にAWS上に作成されているリソースの状態ではありません。

---

## 🏗️ Terraform構成情報

### バックエンド設定

| 項目 | 値 |
|------|-----|
| **バックエンドタイプ** | S3 |
| **S3バケット** | `le-training-tfstate-qj5m90he` |
| **ステートファイルキー** | `training/honda/terraform.tfstate` |
| **リージョン** | ap-northeast-1 |
| **暗号化** | 有効 |

### プロバイダー設定

| 項目 | 値 |
|------|-----|
| **プロバイダー** | hashicorp/aws |
| **バージョン** | ~> 5.0 |
| **リージョン** | ap-northeast-1 |

### プロジェクト変数

| 変数名 | 値 |
|--------|-----|
| **project_name** | `honda-iac-training` |
| **environment** | `training` |
| **aws_region** | `ap-northeast-1` |
| **key_name** | `key-HondaKodai-iac` |

---

## 🌐 ネットワークリソース（VPCモジュール）

### VPC

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-vpc` |
| **CIDRブロック** | `10.0.0.0/16` |
| **DNSホスト名** | 有効 |
| **DNSサポート** | 有効 |

### サブネット構成

#### パブリックサブネット

| サブネット | AZ | CIDR | パブリックIP自動割り当て |
|-----------|-----|------|------------------------|
| `honda-iac-training-public-ap-northeast-1a` | ap-northeast-1a | `10.0.1.0/24` | 有効 |
| `honda-iac-training-public-ap-northeast-1c` | ap-northeast-1c | `10.0.2.0/24` | 有効 |

#### プライベートサブネット

| サブネット | AZ | CIDR | パブリックIP自動割り当て |
|-----------|-----|------|------------------------|
| `honda-iac-training-private-ap-northeast-1a` | ap-northeast-1a | `10.0.11.0/24` | 無効 |
| `honda-iac-training-private-ap-northeast-1c` | ap-northeast-1c | `10.0.12.0/24` | 無効 |

### Internet Gateway

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-igw` |
| **VPC** | `honda-iac-training-vpc` |

### ルートテーブル

#### パブリックルートテーブル

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-public-rt` |
| **デフォルトルート** | `0.0.0.0/0` → Internet Gateway |
| **関連サブネット** | パブリックサブネット2つ |

#### プライベートルートテーブル

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-private-rt` |
| **デフォルトルート** | なし |
| **関連サブネット** | プライベートサブネット2つ |

---

## 🖥️ コンピューティングリソース

### EC2インスタンス

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-ec2` |
| **AMI** | Amazon Linux 2023 (amzn2-ami-hvm-*-x86_64-gp2) |
| **インスタンスタイプ** | `t3.micro` |
| **サブネット** | パブリックサブネット（ap-northeast-1a） |
| **キーペア** | `key-HondaKodai-iac` |
| **IAMインスタンスプロファイル** | `honda-iac-training-ec2-profile` |
| **セキュリティグループ** | `honda-iac-training-ec2-sg` |
| **用途** | WordPress（既存構成） |

**注意**: このEC2インスタンスは既存のWordPress用の構成のようです。ポーカーアプリ用には別途設定が必要です。

---

## 🔒 セキュリティグループ

### ALB セキュリティグループ

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-alb-sg` |
| **説明** | Security group for ALB |

#### インバウンドルール

| ポート | プロトコル | ソース | 説明 |
|--------|-----------|--------|------|
| 22 | TCP | 0.0.0.0/0 | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP from Internet |
| 443 | TCP | 0.0.0.0/0 | HTTPS from Internet |

#### アウトバウンドルール

| ポート | プロトコル | ソース | 説明 |
|--------|-----------|--------|------|
| 0-65535 | All | 0.0.0.0/0 | Allow all |

### EC2 セキュリティグループ

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-ec2-sg` |
| **説明** | Security group for EC2 instances |

#### インバウンドルール

| ポート | プロトコル | ソース | 説明 |
|--------|-----------|--------|------|
| 22 | TCP | 0.0.0.0/0 | SSH from Internet |
| 80 | TCP | 0.0.0.0/0 | HTTP from Internet |
| 80 | TCP | ALB SG | HTTP from ALB |

#### アウトバウンドルール

| ポート | プロトコル | ソース | 説明 |
|--------|-----------|--------|------|
| 0-65535 | All | 0.0.0.0/0 | Allow all |

**⚠️ ポーカーアプリ用の追加設定が必要**:
- ポート5000（Flaskアプリ）のインバウンドルール
- WebSocket通信用の設定

### RDS セキュリティグループ

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-rds-sg` |
| **説明** | Security group for RDS |

#### インバウンドルール

| ポート | プロトコル | ソース | 説明 |
|--------|-----------|--------|------|
| 3306 | TCP | EC2 SG | MySQL access from EC2 |

#### アウトバウンドルール

| ポート | プロトコル | ソース | 説明 |
|--------|-----------|--------|------|
| 0-65535 | All | 0.0.0.0/0 | Allow all |

---

## ⚖️ ロードバランサー（ALB）

### Application Load Balancer

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-alb` |
| **タイプ** | Application Load Balancer |
| **スキーム** | Internet-facing |
| **サブネット** | パブリックサブネット2つ |
| **セキュリティグループ** | `honda-iac-training-alb-sg` |

### ターゲットグループ

| 項目 | 値 |
|------|-----|
| **リソース名** | `honda-iac-training-alb-tg` |
| **ポート** | 80 |
| **プロトコル** | HTTP |
| **VPC** | `honda-iac-training-vpc` |
| **ターゲット** | EC2インスタンス（WordPress） |

#### ヘルスチェック設定

| 項目 | 値 |
|------|-----|
| **パス** | `/` |
| **間隔** | 30秒 |
| **タイムアウト** | 5秒 |
| **正常閾値** | 3回 |
| **異常閾値** | 3回 |
| **成功コード** | 200-399 |

### リスナー

#### HTTPリスナー（ポート80）

| 項目 | 値 |
|------|-----|
| **ポート** | 80 |
| **プロトコル** | HTTP |
| **アクション** | HTTPS (443) へリダイレクト |

#### HTTPSリスナー（ポート443）

| 項目 | 値 |
|------|-----|
| **ポート** | 443 |
| **プロトコル** | HTTPS |
| **SSL証明書ARN** | `arn:aws:acm:ap-northeast-1:565032277391:certificate/940f382f-96e1-4892-a07e-5489b64b0aaf` |
| **SSLポリシー** | ELBSecurityPolicy-2016-08 |
| **アクション** | ターゲットグループへ転送 |

**⚠️ ポーカーアプリ用の設定**:
- 現在のALBはWordPress用（ポート80）に設定されています
- ポーカーアプリ（ポート5000）用のターゲットグループとリスナールールの追加が必要です

---

## 🗄️ データベースリソース（RDS）

### RDS MySQL インスタンス

| 項目 | 値 |
|------|-----|
| **識別子** | `honda-iac-training-rds` |
| **エンジン** | MySQL |
| **エンジンバージョン** | 8.0 |
| **インスタンスクラス** | `db.t3.micro` |
| **ストレージ** | 20 GB |
| **データベース名** | `HondaDB` |
| **ユーザー名** | `HondaKodai` |
| **パスワード** | `warabi0123HIMIKO!` |
| **サブネットグループ** | プライベートサブネット2つ |
| **セキュリティグループ** | `honda-iac-training-rds-sg` |
| **パブリックアクセス** | 無効 |
| **Multi-AZ** | 無効 |
| **最終スナップショット** | スキップ |
| **削除保護** | 無効 |
| **即時適用** | 有効 |

**注意**: このRDSは既存のWordPress用の構成です。ポーカーアプリではデータベースは使用しないため、不要な可能性があります。

---

## 👤 IAM リソース

### EC2 IAM ロール

| 項目 | 値 |
|------|-----|
| **ロール名** | `honda-iac-training-ec2-role` |
| **信頼ポリシー** | EC2サービス |

### アタッチされているポリシー

1. **AmazonSSMManagedInstanceCore**
   - SSM Session Manager を使用するためのポリシー

2. **S3読み取り専用ポリシー（カスタム）**
   - リソース: `arn:aws:s3:::honda-iac-training-*`
   - アクション: `s3:GetObject`, `s3:ListBucket`

3. **RDS読み取りポリシー（カスタム）**
   - アクション: `rds:DescribeDBInstances`, `rds:DescribeDBSubnetGroups`

4. **EC2読み取りポリシー（カスタム）**
   - アクション: `ec2:DescribeSecurityGroups`, `ec2:DescribeInstances`

5. **ALB読み取りポリシー（カスタム）**
   - アクション: `elasticloadbalancing:DescribeLoadBalancers`, `elasticloadbalancing:DescribeTargetGroups`, `elasticloadbalancing:DescribeTargetHealth`

### IAM インスタンスプロファイル

| 項目 | 値 |
|------|-----|
| **プロファイル名** | `honda-iac-training-ec2-profile` |
| **ロール** | `honda-iac-training-ec2-role` |

---

## 📊 リソース一覧サマリー

### 作成されるリソース数

| カテゴリ | リソース数 |
|---------|-----------|
| **VPC関連** | 10+ |
| **EC2** | 1 |
| **ALB** | 1 |
| **RDS** | 1 |
| **セキュリティグループ** | 3 |
| **IAM** | 1ロール + 1プロファイル |
| **合計** | 約20リソース |

---

## ⚠️ ポーカーアプリ用の追加設定が必要な項目

### 1. セキュリティグループ

#### EC2セキュリティグループに追加が必要

```hcl
# ポート5000（Flaskアプリ）を追加
ingress {
  description = "Flask app from Internet"
  from_port   = 5000
  to_port     = 5000
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

# または、ALB経由のみ許可する場合
ingress {
  description              = "Flask app from ALB"
  from_port                = 5000
  to_port                  = 5000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
}
```

### 2. ALB設定

#### ターゲットグループの追加

```hcl
# ポーカーアプリ用ターゲットグループ
resource "aws_lb_target_group" "poker_app" {
  name     = "poker-app-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  
  health_check {
    path = "/"
    # WebSocket対応の設定
  }
}
```

#### リスナールールの追加

```hcl
# パスベースルーティングでポーカーアプリへ転送
resource "aws_lb_listener_rule" "poker_app" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.poker_app.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/*", "/"]
    }
  }
}
```

### 3. EC2インスタンス

#### 既存EC2の利用 vs 新規作成

**オプションA: 既存EC2を利用**
- 既存のWordPress用EC2にポーカーアプリもデプロイ
- ポート5000で動作

**オプションB: 新規EC2を作成（推奨）**
- ポーカーアプリ専用のEC2インスタンスを作成
- よりクリーンな構成

### 4. RDS

#### ポーカーアプリでは不要

- ポーカーアプリはデータベースを使用しない
- 既存のRDSはWordPress用のため、そのまま残す

---

## 💰 コスト見積もり（月額）

| リソース | インスタンスタイプ | 月額見積もり |
|---------|------------------|------------|
| **EC2** | t3.micro | 約$8-10 |
| **ALB** | - | 約$16-20 |
| **RDS** | db.t3.micro | 約$15-18 |
| **データ転送** | - | 月15GBまで無料 |
| **合計** | - | **約$39-48/月** |

**注意**: 
- 無料枠（12ヶ月間）を利用している場合、EC2 t3.microは月750時間まで無料
- データ転送は月15GBまで無料

---

## 🔍 確認事項

### Terraform実行前の確認

- [ ] S3バケット `le-training-tfstate-qj5m90he` が存在するか
- [ ] キーペア `key-HondaKodai-iac` が存在するか
- [ ] ACM証明書が有効か
- [ ] 既存リソースとの競合がないか

### ポーカーアプリ用の追加作業

- [ ] EC2セキュリティグループにポート5000を追加
- [ ] ALBにポーカーアプリ用ターゲットグループを追加
- [ ] リスナールールでWebSocket対応を設定
- [ ] 新規EC2インスタンスを作成するか検討

---

## 📝 次のステップ

1. **既存構成の確認**
   - `terraform plan` を実行して変更内容を確認
   - 既存リソースとの競合をチェック

2. **ポーカーアプリ用の設定追加**
   - セキュリティグループの更新
   - ALB設定の追加
   - 必要に応じて新規EC2インスタンスの作成

3. **Terraform実行**
   - `terraform init`
   - `terraform plan`
   - `terraform apply`

4. **動作確認**
   - EC2へのSSH接続
   - アプリケーションのデプロイ
   - WebSocket通信の確認

---

## 📚 参考資料

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/)
- [AWS ALB Pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- [AWS RDS Pricing](https://aws.amazon.com/rds/pricing/)

---

**最終更新日**: 2024年11月  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

