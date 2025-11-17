# ローカル開発環境のセットアップ

## 📋 必要な環境

- **Python**: 3.8以上
- **ブラウザ**: Chrome, Firefox, Safari など最新版
- **エディタ**: VS Code, Cursor などお好みで

---

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/HondaKodai0123/LE-pair-programming.git
cd LE-pair-programming
```

### 2. Python仮想環境の作成

#### Mac/Linux:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### Windows:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

### 3. 依存関係のインストール

```bash
pip install -r requirements.txt
```

---

## ▶️ アプリケーションの起動

### バックエンドサーバーの起動

```bash
cd backend
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
python app.py
```

サーバーが起動すると、以下のメッセージが表示されます：

```
🎮 Poker Server Starting...
📡 WebSocket server running on http://0.0.0.0:5000
```

### ブラウザでアクセス

```
http://localhost:5000
```

---

## 🎮 動作確認

### 1人で2つのブラウザを使ってテスト

1. **ブラウザ1（Chrome）**:
   - `http://localhost:5000` を開く
   - 名前を「Player1」と入力
   - 「ルームを作成」をクリック
   - ルームIDをコピー（例: `ABC123`）

2. **ブラウザ2（Firefox/シークレットウィンドウ）**:
   - `http://localhost:5000` を開く
   - 名前を「Player2」と入力
   - ルームIDに `ABC123` を入力
   - 「ルームに参加」をクリック

3. **ブラウザ1に戻る**:
   - 「ゲーム開始」ボタンが表示される
   - クリックしてゲーム開始

4. **カード交換**:
   - 両プレイヤーがカードを選択して交換
   - 両方が交換を終えると結果が表示される

---

## 🔧 開発中のTips

### サーバーのホットリロード

`app.py` の最終行を以下のように変更：

```python
socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True)
```

### ポートを変更したい場合

`app.py` の最終行と `frontend/js/game.js` の `SERVER_URL` を変更

### ログを詳しく見る

`app.py` に以下を追加：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## 🐛 トラブルシューティング

### ポート5000が既に使用されている

```bash
# Mac/Linux: ポート5000を使用しているプロセスを確認
lsof -i :5000

# 停止
kill -9 <PID>
```

```powershell
# Windows: ポート5000を使用しているプロセスを確認
netstat -ano | findstr :5000

# 停止
taskkill /PID <PID> /F
```

### モジュールが見つからないエラー

```bash
# 仮想環境が有効化されているか確認
which python  # Mac/Linux
where python  # Windows

# 依存関係を再インストール
pip install -r requirements.txt --force-reinstall
```

### WebSocketが接続できない

1. ブラウザのコンソールを開く（F12）
2. エラーメッセージを確認
3. バックエンドサーバーが起動しているか確認

---

## 📝 コードの編集

### バックエンドの主要ファイル

- `backend/app.py`: Flask + SocketIOのメインサーバー
- `backend/deck.py`: デッキ生成・シャッフル
- `backend/game_logic.py`: 役判定ロジック

### フロントエンドの主要ファイル

- `frontend/index.html`: HTML構造
- `frontend/js/game.js`: クライアント側ロジック
- `frontend/css/style.css`: スタイリング

---

## 🧪 テストの実行

### 手動テスト

1. カード配布が正しく動作するか
2. カード交換が正しく動作するか
3. 役判定が正しいか
4. 勝敗判定が正しいか
5. ルーム機能が正しく動作するか

### 役判定のテスト

Pythonインタラクティブシェルで：

```python
from game_logic import PokerHand

# ロイヤルフラッシュのテスト
cards = [
    {'suit': '♠', 'label': 'A', 'value': 14},
    {'suit': '♠', 'label': 'K', 'value': 13},
    {'suit': '♠', 'label': 'Q', 'value': 12},
    {'suit': '♠', 'label': 'J', 'value': 11},
    {'suit': '♠', 'label': '10', 'value': 10}
]

result = PokerHand.evaluate_hand(cards)
print(result)  # Royal Flush
```

---

## 🔄 Git操作

### コミット前の確認

```bash
git status
git diff
```

### コミット

```bash
git add .
git commit -m "機能追加: カードアニメーション"
git push origin main
```

### ブランチ作成

```bash
git checkout -b feature/new-feature
# 作業...
git add .
git commit -m "新機能実装"
git push origin feature/new-feature
```

---

## 📚 参考資料

- [Flask公式ドキュメント](https://flask.palletsprojects.com/)
- [Flask-SocketIO公式ドキュメント](https://flask-socketio.readthedocs.io/)
- [Socket.IO クライアント公式](https://socket.io/docs/v4/client-api/)
- [ポーカーの役一覧](https://ja.wikipedia.org/wiki/%E3%83%9D%E3%83%BC%E3%82%AB%E3%83%BC%E3%81%AE%E5%BD%B9%E4%B8%80%E8%A6%A7)

---

## 💡 次のステップ

開発が進んだら：
1. ユニットテストを追加
2. エラーハンドリングを強化
3. アニメーション効果を追加
4. 戦績機能を実装（localStorage）
5. AWSにデプロイ（`docs/aws_setup.md` 参照）

---

**Happy Coding! 🎮**

