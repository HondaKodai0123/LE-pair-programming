# AWS環境構築完了レポート

**完了日**: 2024年11月18日  
**EC2インスタンスID**: i-018e13b9f56aacde6  
**パブリックIP**: 3.113.3.129  
**ドメイン**: honda-record-1.postudio.help

---

## ✅ 完了した手順

### 手順1: EC2インスタンスの作成 ✅
- インスタンスID: `i-018e13b9f56aacde6`
- パブリックIP: `3.113.3.129`
- 状態: 実行中

### 手順2: セキュリティグループの設定 ✅
- ポート22 (SSH): 開放済み
- ポート80 (HTTP): 開放済み
- ポート443 (HTTPS): 開放済み
- **ポート5000 (Flaskアプリ): 開放済み** ✅

### 手順3: EC2インスタンスへの接続 ✅
- SSM Session Managerで接続可能
- SSH接続可能（キーペア: `key-HondaKodai-iac.pem`）

### 手順4: サーバー環境のセットアップ ✅
- Python 3.7.16 インストール済み
- Git 2.47.3 インストール済み
- システムアップデート完了

### 手順5: アプリケーションのデプロイ ✅

#### 5.1 リポジトリのクローン ✅
- 場所: `/root/LE-pair-programming`
- GitHubと同期済み

#### 5.2 Python仮想環境の作成 ✅
- 仮想環境: `/root/LE-pair-programming/backend/venv`
- 作成完了

#### 5.3 依存関係のインストール ✅
- Flask 2.2.5 (Python 3.7対応)
- Flask-SocketIO 5.3.5
- Flask-CORS 4.0.0
- その他依存関係インストール完了

#### 5.4 アプリケーションのテスト起動 ✅
- アプリ起動確認済み
- ポート5000でリッスン中

### 手順6: 自動起動の設定（systemd）✅

#### 6.1 systemdサービスファイルの作成 ✅
- ファイル: `/etc/systemd/system/poker-game.service`
- 設定完了

#### 6.2 サービスの有効化と起動 ✅
- サービス有効化済み
- サービス起動中

#### 6.3 サービス状態の確認 ✅
- **状態**: `Active: active (running)`
- PID: 6713, 6718

#### 6.4 ログの確認 ✅
- ログ確認可能: `sudo journalctl -u poker-game -f`

### 手順7: Nginxリバースプロキシの設定 ✅

#### 7.1 Nginxのインストール ✅
- Nginx 1.28.0 インストール済み

#### 7.2 Nginx設定ファイルの作成 ✅
- ファイル: `/etc/nginx/sites-available/poker-game`
- ドメイン: `honda-record-1.postudio.help`
- WebSocket対応設定完了

#### 7.3 設定の有効化 ✅
- シンボリックリンク作成済み
- Nginx再起動完了
- **状態**: `Active: active (running)`

#### 7.4 Nginxの自動起動設定 ✅
- 自動起動有効化済み

### 手順8: SSL証明書の設定 ⚠️ 未完了

**問題**: OpenSSLのバージョンが古い（1.0.2k）ため、certbotが動作しない

**エラー**:
```
ImportError: urllib3 v2.0 only supports OpenSSL 1.1.1+, currently the 'ssl' module is compiled with 'OpenSSL 1.0.2k-fips  26 Jan 2017'
```

**対応方法**:
1. OpenSSLをアップグレード（推奨）
2. urllib3をダウングレード（一時的な対応）
3. AWS ACMを使用して証明書を取得（推奨）

**現状**: HTTPでのアクセスは可能

### 手順9: 動作確認 ✅

#### 9.1 サービス状態 ✅
- **poker-gameサービス**: `active (running)`
- **Nginxサービス**: `active (running)`
- **ポート5000**: リッスン中 (`0.0.0.0:5000`)

#### 9.2 HTTPアクセステスト ✅
- `http://localhost:5000`: 正常応答 (HTTP/1.1 200 OK)
- `http://3.113.3.129:5000`: アクセス可能
- `http://honda-record-1.postudio.help`: Nginx経由でアクセス可能

---

## 🌐 アクセスURL

### 直接アクセス（ポート5000）
- **HTTP**: `http://3.113.3.129:5000`
- **HTTP**: `http://honda-record-1.postudio.help:5000`

### Nginx経由（推奨）
- **HTTP**: `http://honda-record-1.postudio.help`
- **HTTP**: `http://3.113.3.129`

### HTTPS（未設定）
- **HTTPS**: `https://honda-record-1.postudio.help` (SSL証明書設定後に利用可能)

---

## 📊 システム状態

### 実行中のサービス

| サービス | 状態 | PID |
|---------|------|-----|
| **poker-game** | active (running) | 6713, 6718 |
| **nginx** | active (running) | 6769 |

### ポート状態

| ポート | プロトコル | 状態 | 用途 |
|--------|-----------|------|------|
| 22 | TCP | LISTEN | SSH |
| 80 | TCP | LISTEN | HTTP (Nginx) |
| 443 | TCP | LISTEN | HTTPS (Nginx) |
| 5000 | TCP | LISTEN | Flaskアプリ |

---

## 🔧 設定ファイル

### systemdサービス
- **ファイル**: `/etc/systemd/system/poker-game.service`
- **ユーザー**: root
- **作業ディレクトリ**: `/root/LE-pair-programming/backend`
- **実行コマンド**: `/root/LE-pair-programming/backend/venv/bin/python app.py`

### Nginx設定
- **ファイル**: `/etc/nginx/sites-available/poker-game`
- **ドメイン**: `honda-record-1.postudio.help`
- **プロキシ先**: `http://127.0.0.1:5000`
- **WebSocket対応**: 有効

---

## ⚠️ 注意事項

### SSL証明書について
- 現在、SSL証明書は設定されていません
- HTTPでのアクセスのみ可能
- 本番環境ではHTTPS化を推奨

### OpenSSLのバージョン
- 現在のバージョン: OpenSSL 1.0.2k-fips (2017年1月)
- certbotが要求するバージョン: OpenSSL 1.1.1+
- アップグレードが必要

### Pythonバージョン
- 現在のバージョン: Python 3.7.16
- Flask 2.2.5を使用（Python 3.7対応）
- 将来的にはPython 3.8+へのアップグレードを推奨

---

## 🎯 次のステップ

### 1. SSL証明書の設定（推奨）

**オプションA: AWS ACMを使用**
- AWS Certificate Managerで証明書を取得
- ALBに証明書をアタッチ
- ドメインのDNS設定を更新

**オプションB: OpenSSLをアップグレード**
- OpenSSL 1.1.1+にアップグレード
- certbotを再実行

### 2. ドメインのDNS設定
- `honda-record-1.postudio.help` のAレコードをEC2のパブリックIPに設定
- 現在の設定を確認

### 3. 動作テスト
- 2人でゲームをテスト
- WebSocket通信の確認
- エラーハンドリングの確認

### 4. 監視設定
- CloudWatch Logsの設定
- アラートの設定

---

## 📝 コマンドリファレンス

### サービスの管理

```bash
# サービス状態確認
sudo systemctl status poker-game

# サービス再起動
sudo systemctl restart poker-game

# ログ確認
sudo journalctl -u poker-game -f

# Nginx再起動
sudo systemctl restart nginx
```

### アプリケーションの更新

```bash
# リポジトリを更新
cd /root/LE-pair-programming
git pull origin master

# サービスを再起動
sudo systemctl restart poker-game
```

### ポート確認

```bash
# ポート5000の状態確認
sudo netstat -tuln | grep 5000
# または
ss -tuln | grep 5000
```

---

## ✅ チェックリスト（最終版）

- [x] EC2インスタンス作成完了
- [x] セキュリティグループ設定完了（ポート5000含む）
- [x] SSH接続成功
- [x] Python環境セットアップ完了
- [x] アプリケーションデプロイ完了
- [x] systemdサービス設定完了
- [x] Nginx設定完了
- [ ] SSL証明書設定完了（未完了、OpenSSLバージョン問題）
- [x] 動作確認完了（HTTP）

---

## 🎉 まとめ

**AWS環境へのデプロイがほぼ完了しました！**

- ✅ アプリケーションは正常に動作中
- ✅ 自動起動設定済み
- ✅ Nginxリバースプロキシ設定済み
- ⚠️ SSL証明書は未設定（HTTPでのアクセスは可能）

**アクセスURL**: `http://honda-record-1.postudio.help` または `http://3.113.3.129:5000`

---

**最終更新日**: 2024年11月18日  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

