# EC2とGitHubリポジトリの紐付け手順

**作成日**: 2024年11月  
**対象**: オンライン対戦ポーカー（LE-pair-programming）  
**リポジトリ**: https://github.com/HondaKodai0123/LE-pair-programming.git

---

## 📋 概要

このドキュメントでは、AWS EC2インスタンスからGitHubリポジトリにアクセスし、コードをクローン・更新できるようにする手順を説明します。

---

## 🎯 必要な作業

1. **EC2インスタンスへのSSH接続**
2. **Gitのインストール**
3. **GitHubへの認証設定**（SSH鍵またはPersonal Access Token）
4. **リポジトリのクローン**

---

## 🔑 方法1: SSH鍵を使用する方法（推奨）

### ステップ1: EC2インスタンスにSSH接続

#### 1.1 EC2インスタンス情報の確認

```bash
# TerraformのoutputからEC2のパブリックIPを確認
cd /Users/togashishunichi/LE-training-202510/work/week5_pairprograming/infra/envs/training
terraform output
```

または、AWSコンソールからEC2インスタンスのパブリックIPを確認します。

#### 1.2 SSH接続

```bash
# キーペアファイルのパスを指定してSSH接続
ssh -i ~/.ssh/key-HondaKodai-iac.pem ec2-user@<EC2のパブリックIP>

# または、Amazon Linux 2023の場合は
ssh -i ~/.ssh/key-HondaKodai-iac.pem ec2-user@<EC2のパブリックIP>
```

**注意**: キーペアファイルのパーミッションが正しく設定されていることを確認してください。

```bash
chmod 400 ~/.ssh/key-HondaKodai-iac.pem
```

---

### ステップ2: Gitのインストール

EC2インスタンスに接続後、Gitをインストールします。

#### Amazon Linux 2023の場合

```bash
# システムアップデート
sudo yum update -y

# Gitのインストール
sudo yum install -y git
```

#### Ubuntuの場合

```bash
# システムアップデート
sudo apt update

# Gitのインストール
sudo apt install -y git
```

#### インストール確認

```bash
git --version
# 出力例: git version 2.40.0
```

---

### ステップ3: SSH鍵の生成

EC2インスタンス上でSSH鍵を生成します。

```bash
# SSH鍵の生成（GitHub用）
ssh-keygen -t ed25519 -C "ec2-poker-app@honda-iac-training"

# または、ed25519が使えない場合
ssh-keygen -t rsa -b 4096 -C "ec2-poker-app@honda-iac-training"
```

**プロンプトが表示されたら**:
- ファイル名: `~/.ssh/id_ed25519_github` を推奨（デフォルトのままでもOK）
- パスフレーズ: 設定してもOK（設定しない場合はEnterを2回）

#### 公開鍵の内容を確認

```bash
cat ~/.ssh/id_ed25519_github.pub
# または
cat ~/.ssh/id_ed25519.pub
```

**出力例**:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... ec2-poker-app@honda-iac-training
```

---

### ステップ4: GitHubにSSH鍵を登録

#### 4.1 GitHubにログイン

1. https://github.com にアクセス
2. アカウント `HondaKodai0123` でログイン

#### 4.2 SSH鍵を追加

1. **Settings** → **SSH and GPG keys** に移動
2. **New SSH key** をクリック
3. 以下の情報を入力:
   - **Title**: `EC2 Poker App (honda-iac-training)`
   - **Key**: ステップ3でコピーした公開鍵の内容を貼り付け
4. **Add SSH key** をクリック

---

### ステップ5: SSH接続のテスト

EC2インスタンス上で、GitHubへのSSH接続をテストします。

```bash
# SSH接続テスト
ssh -T git@github.com
```

**成功時の出力**:
```
Hi HondaKodai0123! You've successfully authenticated, but GitHub does not provide shell access.
```

**複数のSSH鍵を使用する場合**:

`~/.ssh/config` ファイルを作成して設定します。

```bash
# ~/.ssh/config を作成
cat > ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
EOF

# パーミッション設定
chmod 600 ~/.ssh/config
```

---

### ステップ6: リポジトリのクローン

```bash
# ホームディレクトリに移動
cd ~

# リポジトリをクローン
git clone git@github.com:HondaKodai0123/LE-pair-programming.git

# または、ディレクトリ名を指定
git clone git@github.com:HondaKodai0123/LE-pair-programming.git poker-app

# クローン確認
cd LE-pair-programming
ls -la
```

---

## 🔐 方法2: Personal Access Tokenを使用する方法

SSH鍵の設定が難しい場合、Personal Access Tokenを使用することもできます。

### ステップ1: Personal Access Tokenの作成

#### 1.1 GitHubでトークンを作成

1. GitHubにログイン
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token** → **Generate new token (classic)** をクリック
4. 以下の設定:
   - **Note**: `EC2 Poker App Access`
   - **Expiration**: 適切な期間を選択（例: 90 days）
   - **Scopes**: `repo` にチェック（リポジトリへのフルアクセス）
5. **Generate token** をクリック
6. **トークンをコピー**（後で表示されないため、必ずコピー）

---

### ステップ2: EC2インスタンスに接続

方法1のステップ1を参照してSSH接続します。

---

### ステップ3: Gitのインストール

方法1のステップ2を参照してGitをインストールします。

---

### ステップ4: Git設定

```bash
# Gitのユーザー名とメールアドレスを設定
git config --global user.name "HondaKodai0123"
git config --global user.email "kodai.honda@pr.cri.co.jp"
```

---

### ステップ5: リポジトリのクローン（HTTPS）

```bash
# リポジトリをクローン（HTTPS）
git clone https://github.com/HondaKodai0123/LE-pair-programming.git

# ユーザー名とパスワードを求められたら:
# Username: HondaKodai0123
# Password: <Personal Access Token>
```

**注意**: パスワードには、GitHubのパスワードではなく、**Personal Access Token**を入力します。

---

### ステップ6: 認証情報の保存（オプション）

毎回トークンを入力するのが面倒な場合、Git Credential Helperを使用します。

```bash
# 認証情報を保存
git config --global credential.helper store

# 次回のクローン時にトークンを入力すると、以降は自動で使用されます
```

---

## 🔄 リポジトリの更新

### 最新の変更を取得

```bash
cd ~/LE-pair-programming
git pull origin master
```

### 変更をコミット・プッシュ（必要な場合）

```bash
# 変更をステージング
git add .

# コミット
git commit -m "Update: アプリケーションの更新"

# プッシュ
git push origin master
```

---

## 🛠️ トラブルシューティング

### SSH接続できない

**問題**: `Permission denied (publickey)`

**解決方法**:
1. キーペアファイルのパーミッションを確認
   ```bash
   chmod 400 ~/.ssh/key-HondaKodai-iac.pem
   ```
2. EC2インスタンスのセキュリティグループでポート22が開いているか確認
3. 正しいユーザー名を使用しているか確認（Amazon Linux 2023: `ec2-user`, Ubuntu: `ubuntu`）

---

### Gitクローンできない（SSH鍵の場合）

**問題**: `Permission denied (publickey)` または `Host key verification failed`

**解決方法**:
1. SSH鍵が正しくGitHubに登録されているか確認
2. `~/.ssh/config` の設定を確認
3. SSH接続テストを実行
   ```bash
   ssh -T git@github.com
   ```

---

### Gitクローンできない（Personal Access Tokenの場合）

**問題**: `Authentication failed`

**解決方法**:
1. Personal Access Tokenが正しくコピーされているか確認
2. トークンの有効期限が切れていないか確認
3. `repo` スコープが付与されているか確認

---

### リポジトリが見つからない

**問題**: `Repository not found`

**解決方法**:
1. リポジトリURLが正しいか確認
2. リポジトリがプライベートの場合、認証情報が正しいか確認
3. アカウントにリポジトリへのアクセス権限があるか確認

---

## 📝 推奨設定

### Git設定の最適化

```bash
# デフォルトブランチ名を設定
git config --global init.defaultBranch master

# 自動改行コード変換を無効化（Linux環境）
git config --global core.autocrlf input

# カラーハイライトを有効化
git config --global color.ui auto
```

### エディタの設定

```bash
# デフォルトエディタを設定（vimを使用する場合）
git config --global core.editor vim

# または、nanoを使用する場合
git config --global core.editor nano
```

---

## 🔒 セキュリティのベストプラクティス

1. **SSH鍵のパーミッション**
   - 秘密鍵: `600` (`chmod 600 ~/.ssh/id_ed25519_github`)
   - 公開鍵: `644` (`chmod 644 ~/.ssh/id_ed25519_github.pub`)
   - configファイル: `600` (`chmod 600 ~/.ssh/config`)

2. **Personal Access Token**
   - 最小限のスコープのみ付与
   - 定期的にローテーション
   - 不要になったら削除

3. **認証情報の管理**
   - 認証情報をコードに含めない
   - 環境変数やシークレット管理サービスを使用

---

## ✅ チェックリスト

### SSH鍵を使用する場合

- [ ] EC2インスタンスにSSH接続成功
- [ ] Gitがインストールされている
- [ ] SSH鍵が生成されている
- [ ] GitHubにSSH鍵が登録されている
- [ ] SSH接続テストが成功
- [ ] リポジトリのクローンが成功

### Personal Access Tokenを使用する場合

- [ ] EC2インスタンスにSSH接続成功
- [ ] Gitがインストールされている
- [ ] Gitのユーザー名・メールアドレスが設定されている
- [ ] Personal Access Tokenが作成されている
- [ ] リポジトリのクローンが成功

---

## 📚 参考資料

- [GitHub SSH鍵の設定](https://docs.github.com/ja/authentication/connecting-to-github-with-ssh)
- [Personal Access Tokenの作成](https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Git公式ドキュメント](https://git-scm.com/doc)

---

## 🎯 次のステップ

EC2とGitHubの紐付けが完了したら：

1. **アプリケーションのデプロイ**
   - `docs/aws_setup.md` を参照してアプリケーションをデプロイ

2. **自動デプロイの設定**
   - GitHub ActionsやCI/CDパイプラインの設定を検討

3. **バックアップ**
   - 定期的にリポジトリを更新して最新のコードを保持

---

**最終更新日**: 2024年11月  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

