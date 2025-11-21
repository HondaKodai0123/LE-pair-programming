# EC2サーバーログ確認方法

## SSM Session Managerを使用してログインする場合

```bash
aws ssm start-session --target i-06a64e0c951befc81 --region ap-northeast-1
```

## サーバーログを確認するコマンド

### 1. poker-gameサービスのログを確認（最新200行）

```bash
sudo journalctl -u poker-game -n 200 --no-pager
```

### 2. 交換関連のログのみをフィルタリング

```bash
sudo journalctl -u poker-game -n 500 --no-pager | grep -E "交換|exchange|ready|ラウンド|プレイヤー"
```

### 3. リアルタイムでログを監視

```bash
sudo journalctl -u poker-game -f
```

### 4. 特定の時間範囲のログを確認

```bash
sudo journalctl -u poker-game --since "5 minutes ago" --no-pager
```

### 5. AWS SSM経由でコマンドを実行する場合（ローカルから）

```bash
# 最新200行のログを取得
aws ssm send-command \
  --instance-ids i-06a64e0c951befc81 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo journalctl -u poker-game -n 200 --no-pager"]' \
  --region ap-northeast-1 \
  --query "Command.CommandId" \
  --output text

# コマンドIDを取得したら、結果を確認
aws ssm get-command-invocation \
  --command-id <COMMAND_ID> \
  --instance-id i-06a64e0c951befc81 \
  --region ap-northeast-1 \
  --query "StandardOutputContent" \
  --output text
```

### 6. 交換関連のエラーログを確認

```bash
sudo journalctl -u poker-game -n 500 --no-pager | grep -E "エラー|error|失敗|warning|Warning"
```

### 7. Pythonアプリケーションのログを直接確認

```bash
# アプリケーションのログファイルがある場合
sudo tail -f /var/log/poker-game/app.log

# または、アプリケーションが実行中のプロセスの出力を確認
ps aux | grep python
```

## 確認すべきログ項目

### 交換処理関連
- `交換リクエスト:` - プレイヤーが交換を試みた時のログ
- `全員の交換完了チェック:` - 全員が交換を完了した時のログ
- `next_exchange_roundイベントを送信:` - 次のラウンド開始イベントの送信ログ
- `プレイヤー状態:` - 各プレイヤーの`ready`フラグの状態
- `次のラウンドに進みます:` - ラウンド進行のログ
- `プレイヤー .* のreadyフラグをFalseにリセット` - readyフラグのリセットログ

### エラー関連
- `警告:` - 警告メッセージ
- `交換失敗:` - 交換処理の失敗
- `エラー:` - エラーメッセージ

## トラブルシューティング

### ログが表示されない場合
1. サービスが起動しているか確認: `sudo systemctl status poker-game`
2. サービスの再起動: `sudo systemctl restart poker-game`
3. ログの場所を確認: `sudo journalctl -u poker-game --no-pager | tail -20`

### ログが古い場合
- リアルタイムログを監視: `sudo journalctl -u poker-game -f`
- 最新のログのみ表示: `sudo journalctl -u poker-game -n 50 --no-pager`

