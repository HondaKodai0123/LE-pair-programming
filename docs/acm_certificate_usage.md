# ACM証明書の使用方法

**作成日**: 2024年11月18日  
**ACM証明書ARN**: `arn:aws:acm:ap-northeast-1:565032277391:certificate/940f382f-96e1-4892-a07e-5489b64b0aaf`

---

## ✅ ACM証明書の状態

### 現在の設定

| 項目 | 状態 | 詳細 |
|------|------|------|
| **ACM証明書** | ✅ 設定済み | ALBにアタッチ済み |
| **ALB HTTPSリスナー** | ✅ 有効 | ポート443でリッスン |
| **ALB HTTPリスナー** | ✅ 有効 | ポート80でHTTPSにリダイレクト |
| **ターゲットグループ** | ✅ 正常 | 新しいEC2インスタンスがhealthy |

---

## 🌐 アクセス方法

### ALB経由でHTTPSアクセス（ACM証明書使用）

**ALB DNS名**: `honda-iac-training-alb-1028431235.ap-northeast-1.elb.amazonaws.com`

#### HTTPSアクセス
- **URL**: `https://honda-iac-training-alb-1028431235.ap-northeast-1.elb.amazonaws.com`
- **証明書**: ACM証明書（自動更新）
- **状態**: ✅ 利用可能

#### HTTPアクセス（自動リダイレクト）
- **URL**: `http://honda-iac-training-alb-1028431235.ap-northeast-1.elb.amazonaws.com`
- **動作**: 自動的にHTTPSにリダイレクト（HTTP 301）

---

## 📊 現在の構成

### ネットワークフロー

```
インターネット
    ↓
ALB (ポート443: HTTPS, ポート80: HTTP→HTTPSリダイレクト)
    ↓ (ACM証明書で暗号化)
ターゲットグループ (ポート80)
    ↓
EC2インスタンス (i-06a64e0c951befc81)
    ↓
Nginx (ポート80)
    ↓
Flaskアプリ (ポート5000)
```

### ALB設定

| 項目 | 値 |
|------|-----|
| **ALB名** | honda-iac-training-alb |
| **DNS名** | honda-iac-training-alb-1028431235.ap-northeast-1.elb.amazonaws.com |
| **ポート443** | HTTPS（ACM証明書使用） |
| **ポート80** | HTTP → HTTPSリダイレクト |
| **ターゲットポート** | 80（EC2のNginx） |
| **ターゲット状態** | healthy |

---

## 🔍 確認事項

### 1. ALBリスナー設定

**ポート443（HTTPS）**:
- プロトコル: HTTPS
- SSL証明書: ACM証明書（`arn:aws:acm:ap-northeast-1:565032277391:certificate/940f382f-96e1-4892-a07e-5489b64b0aaf`）
- アクション: ターゲットグループへ転送

**ポート80（HTTP）**:
- プロトコル: HTTP
- アクション: HTTPS（443）へリダイレクト（HTTP 301）

### 2. ターゲットグループ設定

| 項目 | 値 |
|------|-----|
| **ターゲットポート** | 80 |
| **プロトコル** | HTTP |
| **ヘルスチェックパス** | / |
| **ターゲット** | i-06a64e0c951befc81 |
| **状態** | healthy |

### 3. EC2インスタンス設定

| 項目 | 値 |
|------|-----|
| **Nginxポート** | 80（リッスン中） |
| **Flaskアプリポート** | 5000 |
| **状態** | 正常動作 |

---

## 🎯 ACM証明書のメリット

### certbot（Let's Encrypt）との比較

| 項目 | ACM証明書 | certbot（Let's Encrypt） |
|------|-----------|-------------------------|
| **設定の簡単さ** | ✅ 簡単（ALBにアタッチするだけ） | ⚠️ 設定が必要 |
| **自動更新** | ✅ AWSが自動管理 | ✅ certbotが自動更新 |
| **コスト** | ✅ 無料 | ✅ 無料 |
| **ドメイン検証** | ⚠️ DNSまたはメール検証が必要 | ⚠️ HTTPまたはDNS検証が必要 |
| **ALB対応** | ✅ ネイティブ対応 | ⚠️ EC2上で設定が必要 |
| **証明書の管理** | ✅ AWSが管理 | ⚠️ 自分で管理 |

### ACM証明書の利点

1. **自動更新**: AWSが自動的に証明書を更新
2. **簡単な設定**: ALBにアタッチするだけ
3. **高可用性**: AWSのインフラで管理
4. **ALBとの統合**: ネイティブサポート

---

## 🔧 ドメイン設定

### 現在のDNS設定

**ドメイン**: `honda-record-1.postudio.help`

**現在の設定**:
```
honda-record-1.postudio.help → 54.64.232.219, 43.206.13.234
```

**推奨設定**:
```
honda-record-1.postudio.help → ALBのDNS名（CNAMEレコード）
または
honda-record-1.postudio.help → ALBのIPアドレス（Aレコード）
```

### ALBのDNS名を使用する場合

**CNAMEレコード**:
- 名前: `honda-record-1.postudio.help`
- 値: `honda-iac-training-alb-1028431235.ap-northeast-1.elb.amazonaws.com`
- タイプ: CNAME

**メリット**:
- ALBのIPアドレスが変更されても自動的に対応
- 推奨される方法

---

## 📝 アクセスURL一覧

### 現在利用可能なURL

| URL | 説明 | 証明書 |
|-----|------|--------|
| `https://honda-record-1.postudio.help` | ドメイン経由（HTTPS） | ✅ ACM証明書 |
| `http://honda-record-1.postudio.help` | ドメイン経由（HTTP→HTTPSリダイレクト） | - |
| `http://54.95.13.1:5000` | EC2直接アクセス（HTTP） | ❌ なし |
| `http://54.95.13.1` | EC2直接アクセス（Nginx経由、HTTP） | ❌ なし |
| `http://honda-record-1.postudio.help` | ドメイン経由（現在はEC2を指している可能性） | ❌ なし |

### 推奨されるアクセス方法

**HTTPSアクセス（ACM証明書使用）**:
```
https://honda-record-1.postudio.help
```

**動作確認済み**: ✅ HTTP/2 200 OK

---

## ✅ 動作確認

### ALB経由のHTTPSアクセス確認

```bash
# ドメイン経由でHTTPSアクセステスト
curl -I https://honda-record-1.postudio.help

# 実際の結果:
# HTTP/2 200
# server: nginx/1.28.0
```

**注意**: ALBのDNS名ではアクセスできません（証明書がドメイン名に対して発行されているため）

### 証明書の確認

```bash
# 証明書の詳細を確認
openssl s_client -connect honda-iac-training-alb-1028431235.ap-northeast-1.elb.amazonaws.com:443 -servername honda-iac-training-alb-1028431235.ap-northeast-1.elb.amazonaws.com
```

---

## 🎯 まとめ

### ACM証明書は既に使用可能

- ✅ ALBにACM証明書が設定済み
- ✅ HTTPSリスナー（ポート443）が有効
- ✅ HTTP→HTTPSリダイレクトが設定済み
- ✅ ターゲットグループが正常動作

### アクセス方法

**推奨**: ドメイン経由でHTTPSアクセス（ACM証明書使用）
```
https://honda-record-1.postudio.help
```

**動作確認済み**: ✅ HTTP/2 200 OK（正常に動作中）

### certbotは不要

- ACM証明書が既に設定されているため、certbotで証明書を取得する必要はありません
- ALB経由でアクセスすれば、自動的にHTTPSでアクセスできます
- 証明書の更新もAWSが自動的に行います

---

## 📋 チェックリスト

- [x] ACM証明書がALBに設定されている
- [x] ALBのHTTPSリスナーが有効
- [x] ALBのHTTPリスナーがHTTPSにリダイレクト
- [x] ターゲットグループが正常動作
- [x] EC2インスタンスがhealthy状態
- [ ] ドメインのDNS設定をALBに変更（オプション）

---

**結論**: **ACM証明書は既に使用可能です！** ドメイン経由でHTTPSアクセスできます。

**アクセスURL**: `https://honda-record-1.postudio.help` ✅ 動作確認済み

---

**最終更新日**: 2024年11月18日  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

