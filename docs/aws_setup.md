# AWS EC2 環境構築手順

## 📋 概要
このドキュメントでは、オンライン対戦ポーカーアプリをAWS EC2にデプロイする手順を説明します。

---

## 🚀 手順1: EC2インスタンスの作成

### 1.1 AWSマネジメントコンソールにログイン
- https://aws.amazon.com/console/ にアクセス
- AWSアカウントでログイン

### 1.2 EC2ダッシュボードへ移動
1. サービス検索で「EC2」を検索
2. 「インスタンスを起動」をクリック

### 1.3 インスタンス設定

#### **名前とタグ**
- 名前: `poker-game-server`

#### **AMI（Amazon Machine Image）**
- **Ubuntu Server 22.04 LTS** を選択
- アーキテクチャ: 64ビット (x86)

#### **インスタンスタイプ**
- **t2.micro** (無料枠対象)
- vCPU: 1, メモリ: 1GB

#### **キーペア**
- 新しいキーペアを作成
  - 名前: `poker-game-key`
  - タイプ: RSA
  - ファイル形式: `.pem` (Mac/Linux) または `.ppk` (Windows)
- **重要**: ダウンロードしたキーペアファイルを安全な場所に保存

#### **ネットワーク設定**
- VPC: デフォルト
- サブネット: デフォルト
- パブリックIPの自動割り当て: **有効化**

---

## 🔒 手順2: セキュリティグループの設定

### 2.1 セキュリティグループルールの追加

以下のインバウンドルールを設定：

| タイプ | プロトコル | ポート範囲 | ソース | 説明 |
|--------|-----------|-----------|--------|------|
| SSH | TCP | 22 | マイIP | SSH接続用 |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP接続 |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS接続 |
| カスタムTCP | TCP | 5000 | 0.0.0.0/0 | Flaskアプリ |

**注意**: 本番環境では、ポート5000は内部ポートとして使用し、Nginx経由でアクセスすることを推奨

### 2.2 ストレージ設定
- ルートボリューム: **8 GB** (gp3)

### 2.3 インスタンスを起動
- 「インスタンスを起動」をクリック

---

## 💻 手順3: EC2インスタンスへの接続

### 3.1 キーペアのパーミッション設定（Mac/Linux）

```bash
chmod 400 ~/Downloads/poker-game-key.pem
```

### 3.2 SSH接続

```bash
ssh -i ~/Downloads/poker-game-key.pem ubuntu@<EC2のパブリックIP>
```

**EC2のパブリックIP**: EC2ダッシュボードのインスタンス詳細から確認

---

## 🛠️ 手順4: サーバー環境のセットアップ

### 4.1 システムアップデート

```bash
sudo apt update
sudo apt upgrade -y
```

### 4.2 Python3とpipのインストール

```bash
sudo apt install python3 python3-pip python3-venv -y
```

### 4.3 Gitのインストール

```bash
sudo apt install git -y
```

---

## 📦 手順5: アプリケーションのデプロイ

### 5.1 リポジトリのクローン

```bash
cd /home/ubuntu
git clone https://github.com/HondaKodai0123/LE-pair-programming.git
cd LE-pair-programming
```

### 5.2 Python仮想環境の作成

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 5.3 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 5.4 アプリケーションのテスト起動

```bash
python app.py
```

ブラウザで `http://<EC2のパブリックIP>:5000` にアクセスして動作確認

**停止**: `Ctrl + C`

---

## 🔄 手順6: 自動起動の設定（systemd）

### 6.1 systemdサービスファイルの作成

```bash
sudo nano /etc/systemd/system/poker-game.service
```

以下の内容を貼り付け：

```ini
[Unit]
Description=Poker Game Flask Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/LE-pair-programming/backend
Environment="PATH=/home/ubuntu/LE-pair-programming/backend/venv/bin"
ExecStart=/home/ubuntu/LE-pair-programming/backend/venv/bin/python app.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

保存: `Ctrl + X` → `Y` → `Enter`

### 6.2 サービスの有効化と起動

```bash
sudo systemctl daemon-reload
sudo systemctl enable poker-game
sudo systemctl start poker-game
```

### 6.3 サービス状態の確認

```bash
sudo systemctl status poker-game
```

**期待される出力**: `Active: active (running)`

### 6.4 ログの確認

```bash
sudo journalctl -u poker-game -f
```

---

## 🌐 手順7: Nginxリバースプロキシの設定（推奨）

### 7.1 Nginxのインストール

```bash
sudo apt install nginx -y
```

### 7.2 Nginx設定ファイルの作成

```bash
sudo nano /etc/nginx/sites-available/poker-game
```

以下の内容を貼り付け：

```nginx
server {
    listen 80;
    server_name <EC2のパブリックIPまたはドメイン>;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 7.3 設定の有効化

```bash
sudo ln -s /etc/nginx/sites-available/poker-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7.4 Nginxの自動起動設定

```bash
sudo systemctl enable nginx
```

---

## 🔐 手順8: SSL証明書の設定（HTTPS化）

### 8.1 Certbotのインストール

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 8.2 SSL証明書の取得

**注意**: ドメイン名が必要です。EC2のIPアドレスでは取得できません。

```bash
sudo certbot --nginx -d your-domain.com
```

指示に従ってメールアドレスを入力し、利用規約に同意

### 8.3 自動更新の設定

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🎯 手順9: 動作確認

### 9.1 ブラウザでアクセス

- HTTP: `http://<EC2のパブリックIP>`
- HTTPS（ドメイン設定後）: `https://your-domain.com`

### 9.2 2人でゲームをテスト

1. ブラウザ1: ルーム作成
2. ブラウザ2: ルームID入力して参加
3. ゲーム開始

---

## 🔧 トラブルシューティング

### アプリが起動しない

```bash
# ログを確認
sudo journalctl -u poker-game -n 50

# ポート5000が使用されているか確認
sudo netstat -tulpn | grep 5000
```

### Nginxが起動しない

```bash
# 設定ファイルの構文チェック
sudo nginx -t

# エラーログを確認
sudo tail -f /var/log/nginx/error.log
```

### WebSocketが接続できない

- セキュリティグループでポート5000（またはNginxのポート80/443）が開いているか確認
- ブラウザのコンソールでエラーメッセージを確認

---

## 📊 監視とメンテナンス

### サーバー負荷の確認

```bash
# CPU・メモリ使用率
htop

# ディスク使用率
df -h
```

### アプリの再起動

```bash
sudo systemctl restart poker-game
```

### ログのローテーション

```bash
# ログサイズを定期的に確認
sudo journalctl --disk-usage
```

---

## 💰 料金の目安

### 無料枠内での使用
- **EC2 t2.micro**: 月750時間まで無料（12ヶ月間）
- **データ転送**: 月15GBまで無料

### 無料枠超過後
- **EC2 t2.micro**: 約$8-10/月
- **Elastic IP**: 使用中は無料、停止中は$0.005/時

---

## 🛡️ セキュリティのベストプラクティス

1. **SSH鍵の管理**: `.pem`ファイルを絶対に公開しない
2. **定期的なアップデート**: `sudo apt update && sudo apt upgrade`
3. **ファイアウォール**: 必要最小限のポートのみ開放
4. **強力なパスワード**: データベース等で使用する場合
5. **バックアップ**: 定期的にスナップショットを取得

---

## ✅ チェックリスト

- [ ] EC2インスタンス作成完了
- [ ] セキュリティグループ設定完了
- [ ] SSH接続成功
- [ ] Python環境セットアップ完了
- [ ] アプリケーションデプロイ完了
- [ ] systemdサービス設定完了
- [ ] Nginx設定完了（オプション）
- [ ] SSL証明書設定完了（オプション）
- [ ] 動作確認完了

---

## 📞 サポート

問題が発生した場合：
1. エラーログを確認
2. GitHub Issuesで報告
3. 講師に質問

---

**お疲れ様でした！これでAWSへのデプロイが完了です 🎉**

