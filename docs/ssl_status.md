# SSL証明書の状況と対応

**作成日**: 2024年11月18日  
**ドメイン**: honda-record-1.postudio.help

---

## 🔍 現在の状況

### 現在の環境（既存のEC2インスタンス）

| 項目 | 状態 | 詳細 |
|------|------|------|
| **SSL証明書** | ❌ 未設定 | certbotが動作しない |
| **OpenSSL** | 1.0.2k (2017年) | 古すぎてcertbotが動作しない |
| **HTTPS** | ❌ 利用不可 | HTTPのみ利用可能 |
| **問題** | OpenSSLバージョンが古い | certbotが要求する1.1.1+未満 |

**エラー内容**:
```
ImportError: urllib3 v2.0 only supports OpenSSL 1.1.1+, 
currently the 'ssl' module is compiled with 'OpenSSL 1.0.2k-fips  26 Jan 2017'
```

---

## ✅ 新しい環境（Terraform適用後）

### Amazon Linux 2023使用時

| 項目 | 状態 | 詳細 |
|------|------|------|
| **OpenSSL** | 3.x | certbotが動作する |
| **certbot** | ✅ 動作可能 | SSL証明書の取得が可能 |
| **HTTPS** | ✅ 設定可能 | Let's Encryptで証明書取得可能 |

**期待される動作**:
- certbotが正常に動作
- Let's EncryptからSSL証明書を取得可能
- HTTPSでのアクセスが可能

---

## 📋 SSL証明書取得の要件

### 1. 技術的要件

#### ✅ 新しい環境では満たされる要件

- [x] **OpenSSL 1.1.1以上** → Amazon Linux 2023では3.x
- [x] **certbotがインストール可能** → pip3でインストール可能
- [x] **Nginxが設定済み** → 既に設定済み
- [x] **ポート80が開放されている** → セキュリティグループで開放済み

#### ⚠️ 確認が必要な要件

- [ ] **ドメインのDNS設定** → 確認が必要
- [ ] **ドメインがEC2のパブリックIPを指している** → 新しいIPに更新が必要

### 2. DNS設定の要件

**必要な設定**:
- ドメイン `honda-record-1.postudio.help` のAレコード
- EC2インスタンスのパブリックIPを指す必要がある

**注意**:
- Terraform適用後、EC2インスタンスが再作成される
- パブリックIPが変更される可能性がある
- DNS設定を新しいIPに更新する必要がある

---

## 🔄 SSL証明書取得の手順（新しい環境）

### ステップ1: Terraform適用

```bash
cd /Users/togashishunichi/LE-training-202510/work/week5_pairprograming/infra/envs/training
terraform apply tfplan
```

### ステップ2: 新しいインスタンスの情報を取得

```bash
# 新しいインスタンスIDを取得
terraform output wordpress_instance_id

# 新しいパブリックIPを取得
aws ec2 describe-instances \
  --instance-ids <新しいインスタンスID> \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

### ステップ3: DNS設定の確認・更新

**確認**:
```bash
dig +short honda-record-1.postudio.help
```

**更新が必要な場合**:
- ドメイン管理画面でAレコードを新しいパブリックIPに更新
- DNSの反映を待つ（通常5-30分）

### ステップ4: アプリケーションの再デプロイ

新しいインスタンスにアプリケーションをデプロイ（既存の手順を参照）

### ステップ5: certbotのインストール

```bash
# EC2インスタンスにSSH接続
ssh -i ~/.ssh/key-HondaKodai-iac.pem ec2-user@<新しいパブリックIP>

# certbotをインストール
sudo yum install -y python3-pip
sudo pip3 install certbot certbot-nginx
```

### ステップ6: SSL証明書の取得

```bash
# certbotでSSL証明書を取得
sudo /usr/local/bin/certbot --nginx \
  -d honda-record-1.postudio.help \
  --non-interactive \
  --agree-tos \
  --email kodai.honda@pr.cri.co.jp \
  --redirect
```

**期待される結果**:
- SSL証明書が正常に取得される
- Nginx設定が自動更新される
- HTTPSでのアクセスが可能になる

---

## ⚠️ 現在の環境でのSSL設定

### 現在の環境では不可能

**理由**:
- OpenSSL 1.0.2kが古すぎてcertbotが動作しない
- SSL証明書の取得ができない

**対応方法**:

#### オプション1: HTTPで運用を継続（推奨）
- 現在の環境ではHTTPでの運用を継続
- 新しい環境に移行後にHTTPS化

#### オプション2: AWS ACMを使用（推奨）
- AWS Certificate Managerで証明書を取得
- ALBに証明書をアタッチ
- ドメインのDNS設定をALBに変更

**メリット**:
- OpenSSLのバージョンに依存しない
- 証明書の自動更新が可能
- より安全

---

## 🎯 推奨される対応

### 短期的な対応（現在の環境）

1. **HTTPでの運用を継続**
   - 現在の環境ではSSL証明書の取得が不可能
   - HTTPでのアクセスは正常に動作している

2. **新しい環境への移行を計画**
   - Terraform適用でAmazon Linux 2023に移行
   - 移行後にSSL証明書を取得

### 長期的な対応（新しい環境）

1. **Terraform適用**
   - Amazon Linux 2023のインスタンスを作成

2. **DNS設定の更新**
   - 新しいパブリックIPにAレコードを更新

3. **SSL証明書の取得**
   - certbotでLet's Encrypt証明書を取得
   - HTTPSでのアクセスを有効化

---

## 📊 環境別のSSL対応状況

| 環境 | OpenSSL | certbot | SSL証明書 | HTTPS |
|------|---------|---------|-----------|-------|
| **現在（Amazon Linux 2）** | 1.0.2k | ❌ 動作しない | ❌ 取得不可 | ❌ 利用不可 |
| **新環境（Amazon Linux 2023）** | 3.x | ✅ 動作可能 | ✅ 取得可能 | ✅ 利用可能 |

---

## ✅ チェックリスト

### 現在の環境

- [x] HTTPでのアクセスは正常
- [ ] SSL証明書は未設定（OpenSSLが古いため不可能）
- [ ] HTTPSは利用不可

### 新しい環境（Terraform適用後）

- [ ] Terraform適用完了
- [ ] 新しいインスタンスのパブリックIPを取得
- [ ] DNS設定を新しいIPに更新
- [ ] DNSの反映を確認
- [ ] certbotをインストール
- [ ] SSL証明書を取得
- [ ] HTTPSでのアクセスを確認

---

## 🔍 DNS設定の確認方法

### 現在のDNS設定を確認

```bash
# Aレコードを確認
dig +short honda-record-1.postudio.help

# 詳細情報を確認
dig honda-record-1.postudio.help
```

### 期待される設定

**Aレコード**:
- 名前: `honda-record-1.postudio.help`
- 値: EC2インスタンスのパブリックIP
- TTL: 300-3600秒（推奨）

---

## 📝 まとめ

### 現在の環境

**SSL証明書の取得**: ❌ **不可能**
- OpenSSL 1.0.2kが古すぎてcertbotが動作しない
- HTTPでの運用を継続

### 新しい環境（Terraform適用後）

**SSL証明書の取得**: ✅ **可能**
- OpenSSL 3.xでcertbotが正常に動作
- Let's Encryptで証明書を取得可能
- HTTPSでのアクセスが可能

**結論**: 現在の環境ではSSL証明書の取得は不可能ですが、新しい環境（Amazon Linux 2023）では問題なく取得できます。

---

**最終更新日**: 2024年11月18日  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

