# AWS環境構築進捗状況

**確認日**: 2024年11月18日  
**EC2インスタンスID**: i-018e13b9f56aacde6  
**パブリックIP**: 3.113.3.129

---

## 📊 完了状況サマリー

| 手順 | 状態 | 備考 |
|------|------|------|
| **手順1: EC2インスタンスの作成** | ✅ 完了 | インスタンスID: i-018e13b9f56aacde6 |
| **手順2: セキュリティグループの設定** | ⚠️ 要確認 | ポート5000が開いているか要確認 |
| **手順3: EC2インスタンスへの接続** | ✅ 完了 | SSM Session Managerで接続可能 |
| **手順4: サーバー環境のセットアップ** | ✅ 完了 | Python 3.7.16, Git 2.47.3 インストール済み |
| **手順5: アプリケーションのデプロイ** | ⚠️ 一部完了 | リポジトリクローン済み、仮想環境未作成 |
| **手順6: 自動起動の設定（systemd）** | ❌ 未完了 | サービス未設定 |
| **手順7: Nginxリバースプロキシの設定** | ⚠️ 一部完了 | Nginxインストール済み、設定未完了 |
| **手順8: SSL証明書の設定** | ❌ 未完了 | ドメインが必要 |
| **手順9: 動作確認** | ❌ 未完了 | アプリが起動していない |

---

## ✅ 完了している手順

### 手順1: EC2インスタンスの作成 ✅

- **インスタンスID**: `i-018e13b9f56aacde6`
- **パブリックIP**: `3.113.3.129`
- **状態**: 実行中

### 手順3: EC2インスタンスへの接続 ✅

- **接続方法**: SSM Session Manager
- **SSH接続**: 可能（キーペア: `key-HondaKodai-iac.pem`）
- **GitHub接続**: 正常（SSH鍵設定済み）

### 手順4: サーバー環境のセットアップ ✅

#### 4.1 システムアップデート
- ✅ 完了（推測：システムが最新状態）

#### 4.2 Python3とpipのインストール
- ✅ **Python 3.7.16** インストール済み
- ⚠️ pipのバージョンは未確認

#### 4.3 Gitのインストール
- ✅ **Git 2.47.3** インストール済み

### 手順5: アプリケーションのデプロイ（一部完了）

#### 5.1 リポジトリのクローン ✅
- ✅ リポジトリクローン済み
- **場所**: `/root/LE-pair-programming`
- **ブランチ**: `master`
- **状態**: GitHubと同期済み

#### 5.2 Python仮想環境の作成 ❌
- ❌ 仮想環境（venv）が未作成

#### 5.3 依存関係のインストール ❌
- ❌ 仮想環境がないため未実行

#### 5.4 アプリケーションのテスト起動 ❌
- ❌ アプリが起動していない（ポート5000が未使用）

### 手順7: Nginxリバースプロキシの設定（一部完了）

#### 7.1 Nginxのインストール ✅
- ✅ **Nginx 1.28.0** インストール済み

#### 7.2 Nginx設定ファイルの作成 ❌
- ❌ 設定ファイル未作成

#### 7.3 設定の有効化 ❌
- ❌ 未実行

---

## ⚠️ 要確認・未完了の手順

### 手順2: セキュリティグループの設定 ⚠️

**確認が必要な項目**:
- [ ] ポート22（SSH）が開いているか
- [ ] ポート80（HTTP）が開いているか
- [ ] ポート443（HTTPS）が開いているか
- [ ] **ポート5000（Flaskアプリ）が開いているか** ← 重要

**確認方法**:
```bash
# AWSコンソールでセキュリティグループを確認
# または、Terraformのoutputから確認
```

---

### 手順5: アプリケーションのデプロイ（残り作業）

#### 5.2 Python仮想環境の作成

```bash
cd /root/LE-pair-programming/backend
python3 -m venv venv
source venv/bin/activate
```

#### 5.3 依存関係のインストール

```bash
pip install -r requirements.txt
```

#### 5.4 アプリケーションのテスト起動

```bash
python app.py
```

**確認**: `http://3.113.3.129:5000` にアクセス

---

### 手順6: 自動起動の設定（systemd）❌

**必要な作業**:

1. systemdサービスファイルの作成
   ```bash
   sudo nano /etc/systemd/system/poker-game.service
   ```

2. サービスファイルの内容（注意: ユーザーは`root`なので`ubuntu`ではなく`root`に変更）
   ```ini
   [Unit]
   Description=Poker Game Flask Application
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/root/LE-pair-programming/backend
   Environment="PATH=/root/LE-pair-programming/backend/venv/bin"
   ExecStart=/root/LE-pair-programming/backend/venv/bin/python app.py
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   ```

3. サービスの有効化と起動
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable poker-game
   sudo systemctl start poker-game
   ```

---

### 手順7: Nginxリバースプロキシの設定（残り作業）

#### 7.2 Nginx設定ファイルの作成

```bash
sudo nano /etc/nginx/sites-available/poker-game
```

**設定内容**:
```nginx
server {
    listen 80;
    server_name 3.113.3.129;

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

#### 7.3 設定の有効化

```bash
sudo ln -s /etc/nginx/sites-available/poker-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 手順8: SSL証明書の設定 ❌

**注意**: ドメイン名が必要です。EC2のIPアドレスでは取得できません。

- ドメインを取得する必要がある
- または、この手順はスキップしてHTTPのみで運用

---

## 🎯 次のステップ（優先順位順）

### 1. セキュリティグループの確認（最優先）

```bash
# AWSコンソールで確認
# または、Terraformで確認
cd /Users/togashishunichi/LE-training-202510/work/week5_pairprograming/infra/envs/training
terraform output
```

**ポート5000が開いていない場合、追加が必要**:
- AWSコンソールでセキュリティグループを編集
- または、Terraformでセキュリティグループを更新

---

### 2. 仮想環境の作成と依存関係のインストール

```bash
# EC2にSSH接続
ssh -i ~/.ssh/key-HondaKodai-iac.pem ec2-user@3.113.3.129

# 仮想環境の作成
cd /root/LE-pair-programming/backend
python3 -m venv venv
source venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt
```

---

### 3. アプリケーションのテスト起動

```bash
# 仮想環境をアクティベート
source venv/bin/activate

# アプリを起動
python app.py
```

**確認**: ブラウザで `http://3.113.3.129:5000` にアクセス

---

### 4. systemdサービスの設定

上記の「手順6」を参照

---

### 5. Nginx設定

上記の「手順7」を参照

---

## 📝 注意事項

### ユーザーの違い

- **aws_setup.md**: `ubuntu` ユーザーを想定
- **実際のEC2**: `root` ユーザーで実行されている

**対応**:
- systemdサービスファイルの`User`を`root`に変更
- パスを`/home/ubuntu`から`/root`に変更

---

### Pythonバージョン

- **インストール済み**: Python 3.7.16
- **推奨**: Python 3.8以上

**確認**: `requirements.txt`の依存関係がPython 3.7で動作するか確認

---

## ✅ チェックリスト（更新版）

- [x] EC2インスタンス作成完了
- [ ] セキュリティグループ設定完了（ポート5000要確認）
- [x] SSH接続成功
- [x] Python環境セットアップ完了
- [ ] アプリケーションデプロイ完了（仮想環境・依存関係未完了）
- [ ] systemdサービス設定完了
- [ ] Nginx設定完了（インストール済み、設定未完了）
- [ ] SSL証明書設定完了（オプション、ドメイン必要）
- [ ] 動作確認完了

---

**最終更新日**: 2024年11月18日  
**確認者**: 開発チーム

