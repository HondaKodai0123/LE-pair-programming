# AWS設定のバージョン問題と修正

**作成日**: 2024年11月18日  
**問題**: TerraformのAMIフィルターが誤ってAmazon Linux 2を指定していた

---

## 🔍 問題の詳細

### 現在のEC2インスタンスの状態

| 項目 | 現在のバージョン | 問題点 |
|------|----------------|--------|
| **OS** | Amazon Linux 2 | 2025年6月にサポート終了予定 |
| **Python** | 3.7.16 | 2023年6月にサポート終了 |
| **OpenSSL** | 1.0.2k-fips (2017年1月) | certbotが要求する1.1.1+に対応していない |
| **AMI ID** | ami-0bebd3d4452b0f238 | Amazon Linux 2 |

### Terraform設定の問題

**修正前**:
```hcl
data "aws_ami" "amazon_linux_2023" {
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]  # ❌ Amazon Linux 2のフィルター
  }
}
```

**修正後**:
```hcl
data "aws_ami" "amazon_linux_2023" {
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]  # ✅ Amazon Linux 2023のフィルター
  }
}
```

---

## 📊 バージョン比較

### Amazon Linux 2 vs Amazon Linux 2023

| 項目 | Amazon Linux 2 | Amazon Linux 2023 |
|------|---------------|-------------------|
| **リリース** | 2017年 | 2023年 |
| **サポート終了** | 2025年6月 | 2028年6月（予定） |
| **Python** | 3.7.x | 3.9+ |
| **OpenSSL** | 1.0.2k | 3.x |
| **パッケージマネージャー** | yum | dnf |
| **システム管理** | systemd | systemd |

### 期待されるバージョン（Amazon Linux 2023使用時）

| 項目 | 期待されるバージョン |
|------|---------------------|
| **Python** | 3.9+ |
| **OpenSSL** | 3.x |
| **certbot** | 正常に動作（OpenSSL 3.x対応） |
| **Flask** | 3.0.0が使用可能 |

---

## ⚠️ 現在の問題点

### 1. OpenSSLバージョンが古い

**問題**: certbotが動作しない
```
ImportError: urllib3 v2.0 only supports OpenSSL 1.1.1+, 
currently the 'ssl' module is compiled with 'OpenSSL 1.0.2k-fips  26 Jan 2017'
```

**影響**:
- SSL証明書の自動取得ができない
- HTTPS化ができない

### 2. Pythonバージョンが古い

**問題**: Flask 3.0.0が使用できない
- Python 3.7ではFlask 3.0.0がインストールできない
- Flask 2.2.5にダウングレードが必要

**影響**:
- 最新のFlask機能が使えない
- セキュリティアップデートが受けられない可能性

### 3. OSサポート終了が近い

**問題**: Amazon Linux 2のサポートが2025年6月に終了
- セキュリティパッチが提供されなくなる
- 新機能の追加がなくなる

---

## ✅ 修正内容

### Terraform設定の修正

**ファイル**: `infra/envs/training/main.tf`

**変更内容**:
- AMIフィルターを `amzn2-ami-hvm-*-x86_64-gp2` から `al2023-ami-*-x86_64` に変更

**効果**:
- 次回のTerraform適用時にAmazon Linux 2023のAMIが使用される
- 新しいEC2インスタンスには最新のバージョンがインストールされる

---

## 🔄 移行手順

### 既存インスタンスをAmazon Linux 2023に移行する場合

#### オプション1: 新しいインスタンスを作成（推奨）

1. **Terraform設定を適用**
   ```bash
   cd infra/envs/training
   terraform plan
   terraform apply
   ```

2. **新しいインスタンスにアプリケーションをデプロイ**
   - 既存の手順（手順5-9）を実行

3. **動作確認後、古いインスタンスを削除**

#### オプション2: 既存インスタンスをアップグレード（非推奨）

**注意**: Amazon Linux 2からAmazon Linux 2023へのインプレースアップグレードは公式にサポートされていません。

---

## 📝 今後の対応

### 短期的な対応（現在のインスタンス）

1. **HTTPでの運用を継続**
   - SSL証明書なしでもHTTPで動作可能
   - 本番環境ではHTTPS化を推奨

2. **Flask 2.2.5を使用**
   - Python 3.7対応の最新バージョン
   - セキュリティパッチは継続して提供される

### 長期的な対応（新しいインスタンス作成時）

1. **Amazon Linux 2023を使用**
   - Terraform設定を修正済み
   - 次回のインスタンス作成時に自動適用

2. **最新バージョンの使用**
   - Python 3.9+
   - Flask 3.0.0
   - OpenSSL 3.x
   - certbotが正常に動作

---

## 🎯 推奨事項

### 即座に実施すべきこと

1. ✅ **Terraform設定の修正**（完了）
   - AMIフィルターを修正済み

2. ⚠️ **新しいインスタンスの作成を検討**
   - 可能であれば、Amazon Linux 2023の新しいインスタンスを作成
   - より安全で長期的なサポートが受けられる

### 現在のインスタンスで継続運用する場合

1. **HTTPでの運用を継続**
   - 現状のままで動作可能

2. **定期的なセキュリティアップデート**
   ```bash
   sudo yum update -y
   ```

3. **2025年6月までに移行計画を立てる**
   - Amazon Linux 2のサポート終了前に移行

---

## 📚 参考資料

- [Amazon Linux 2023 リリースノート](https://docs.aws.amazon.com/linux/al2023/release-notes/)
- [Amazon Linux 2 サポート終了スケジュール](https://aws.amazon.com/amazon-linux-2/faqs/)
- [OpenSSL バージョン要件](https://www.openssl.org/)
- [Python サポート終了スケジュール](https://devguide.python.org/versions/)

---

**最終更新日**: 2024年11月18日  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

