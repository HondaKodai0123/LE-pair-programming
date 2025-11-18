# Terraform Plan 実行結果サマリー

**実行日**: 2024年11月18日  
**コマンド**: `terraform plan`

---

## 📊 変更サマリー

**Plan: 3 to add, 3 to change, 2 to destroy**

- **新規作成**: 3リソース
- **更新**: 3リソース
- **削除・再作成**: 2リソース

---

## ⚠️ 重要な変更（削除・再作成）

### 1. EC2インスタンス（削除・再作成）

**削除されるもの**:
- **インスタンスID**: `i-018e13b9f56aacde6`
- **AMI**: `ami-0bebd3d4452b0f238` (Amazon Linux 2)
- **パブリックIP**: `3.113.3.129`（変更される可能性あり）

**作成されるもの**:
- **新しいインスタンス**（新しいインスタンスID）
- **AMI**: `ami-0b79d0fa8749d959f` (Amazon Linux 2023)
- **新しいパブリックIP**（自動割り当て）

**理由**: AMIが変更されるため、インスタンスの再作成が必要

**⚠️ 注意事項**:
- **既存のインスタンスが削除されます**
- **インスタンス上のデータは失われます**
- **アプリケーションの再デプロイが必要です**
- **パブリックIPが変更される可能性があります**

### 2. ALBターゲットグループアタッチメント（削除・再作成）

**削除されるもの**:
- 既存のターゲットグループアタッチメント

**作成されるもの**:
- 新しいターゲットグループアタッチメント（新しいEC2インスタンス用）

**理由**: EC2インスタンスが再作成されるため

---

## ➕ 新規作成されるリソース

### 1. セキュリティグループルール（ALB → EC2）

**リソース**: `module.security_groups.aws_security_group_rule.alb_to_ec2`

**内容**:
- ALBからEC2へのHTTP通信（ポート80）を許可
- セキュリティグループ間の通信ルール

**影響**: 既存のルールがTerraformで管理されていないため、新規作成として認識

---

## 🔄 更新されるリソース

### 1. EC2セキュリティグループ

**リソース**: `module.security_groups.aws_security_group.ec2`

**変更内容**:
- ポート5000のルールに説明（description）を追加
  - 変更前: `description = ""`
  - 変更後: `description = "Flask app from Internet"`

**影響**: 機能的には変更なし（説明の追加のみ）

### 2. RDSセキュリティグループ

**リソース**: `module.security_groups.aws_security_group.rds`

**変更内容**:
- タグの更新
  - `Environment = "training"` を追加
  - `Name` タグを `honda-iac-training-rds` から `honda-iac-training-rds-sg` に変更

**影響**: タグの変更のみ、機能への影響なし

### 3. RDSインスタンス

**リソース**: `module.rds.aws_db_instance.this`

**変更内容**:
- タグの更新（詳細は表示されていないが、タグの同期）

**影響**: タグの変更のみ、データベースへの影響なし

---

## 📋 変更詳細

### EC2インスタンスの変更点

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| **AMI** | ami-0bebd3d4452b0f238 (Amazon Linux 2) | ami-0b79d0fa8749d959f (Amazon Linux 2023) |
| **OS** | Amazon Linux 2 | Amazon Linux 2023 |
| **Python** | 3.7.16 | 3.9+ |
| **OpenSSL** | 1.0.2k | 3.x |
| **インスタンスID** | i-018e13b9f56aacde6 | （新規作成） |
| **パブリックIP** | 3.113.3.129 | （新規割り当て） |

---

## ⚠️ 重要な注意事項

### 1. データのバックアップ

**EC2インスタンス上のデータ**:
- `/root/LE-pair-programming/` のリポジトリ
- アプリケーションの設定ファイル
- systemdサービス設定
- Nginx設定

**推奨アクション**:
- GitHubリポジトリは既に同期済み（問題なし）
- 設定ファイルはTerraformで管理されていないため、手動でバックアップ推奨

### 2. アプリケーションの再デプロイ

新しいインスタンス作成後、以下を再実行する必要があります：

1. **リポジトリのクローン**
   ```bash
   cd /root
   git clone git@github.com:HondaKodai0123/LE-pair-programming.git
   ```

2. **仮想環境の作成と依存関係のインストール**
   ```bash
   cd LE-pair-programming/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **systemdサービスの設定**
   - `/etc/systemd/system/poker-game.service` を作成

4. **Nginx設定**
   - `/etc/nginx/sites-available/poker-game` を作成

5. **サービスの起動**
   ```bash
   sudo systemctl start poker-game
   sudo systemctl restart nginx
   ```

### 3. DNS設定の確認

**パブリックIPが変更される場合**:
- ドメイン `honda-record-1.postudio.help` のAレコードを更新する必要がある可能性

### 4. ダウンタイム

**予想されるダウンタイム**:
- EC2インスタンスの再作成: 約5-10分
- アプリケーションの再デプロイ: 約10-15分
- **合計**: 約15-25分のダウンタイム

---

## 🎯 推奨される実行手順

### オプション1: 即座に適用（ダウンタイムあり）

```bash
cd /Users/togashishunichi/LE-training-202510/work/week5_pairprograming/infra/envs/training
terraform apply tfplan
```

**その後**:
- 新しいインスタンスにSSH接続
- アプリケーションを再デプロイ

### オプション2: 準備してから適用（推奨）

1. **設定ファイルのバックアップ**
   ```bash
   # EC2インスタンスから設定ファイルを取得
   scp -i ~/.ssh/key-HondaKodai-iac.pem ec2-user@3.113.3.129:/etc/systemd/system/poker-game.service ./
   scp -i ~/.ssh/key-HondaKodai-iac.pem ec2-user@3.113.3.129:/etc/nginx/sites-available/poker-game ./
   ```

2. **Terraform適用**
   ```bash
   terraform apply tfplan
   ```

3. **新しいインスタンスの情報を取得**
   ```bash
   terraform output wordpress_instance_id
   aws ec2 describe-instances --instance-ids <新しいインスタンスID> --query 'Reservations[0].Instances[0].PublicIpAddress'
   ```

4. **アプリケーションの再デプロイ**
   - 上記の「アプリケーションの再デプロイ」手順を実行

---

## 📝 変更されないリソース

以下のリソースは変更されません：

- ✅ VPC
- ✅ サブネット
- ✅ Internet Gateway
- ✅ ルートテーブル
- ✅ ALB（Application Load Balancer）
- ✅ ターゲットグループ
- ✅ RDSインスタンス（データは保持）
- ✅ IAMロール・ポリシー
- ✅ セキュリティグループ（ルールの説明追加のみ）

---

## 🔍 確認事項

### Terraform適用前に確認

- [ ] 既存のインスタンス上のデータがバックアップされているか
- [ ] アプリケーションの再デプロイ手順が準備されているか
- [ ] ダウンタイムが許容できるか
- [ ] DNS設定の更新が必要か

### Terraform適用後に確認

- [ ] 新しいインスタンスが正常に起動しているか
- [ ] パブリックIPが取得できたか
- [ ] SSH接続が可能か
- [ ] アプリケーションが正常に動作しているか

---

## 📊 リソース変更一覧表

| リソース | アクション | 理由 |
|---------|-----------|------|
| EC2インスタンス | 削除・再作成 | AMI変更（Amazon Linux 2 → 2023） |
| ALBターゲットグループアタッチメント | 削除・再作成 | EC2再作成に伴う |
| EC2セキュリティグループ | 更新 | ポート5000ルールの説明追加 |
| RDSセキュリティグループ | 更新 | タグの更新 |
| RDSインスタンス | 更新 | タグの更新 |
| ALB→EC2セキュリティグループルール | 新規作成 | Terraform管理化 |

---

**最終更新日**: 2024年11月18日  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

