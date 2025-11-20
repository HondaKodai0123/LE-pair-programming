# プレイヤー戦績の保存場所と保存方法

## 変更履歴

### 2024年 - 戦績機能の実装と改善

1. **ac5f97e** - ユーザー名をキーにした統計情報機能を追加
   - 対戦数、勝率、出した役と回数を記録・表示する機能を実装
   - ローカルストレージに戦績を保存する仕組みを追加

2. **cd8aef9** - 参加プレイヤーの統計情報が記録されない問題を修正
   - サーバーから返されるデータにプレイヤー名を含めるように修正

3. **3daedf4** - 参加プレイヤーの統計情報が記録されない問題を修正
   - `game_result`イベントにプレイヤー名を含めるように修正

4. **4b650af** - 統計情報更新処理に詳細なログを追加
   - プレイヤーAの統計が更新されない問題の調査用にログを追加
   - 統計情報更新前後の詳細なログを出力

5. **d207530** - 統計情報更新処理を改善
   - 複数のソースからプレイヤー名を取得するように改善
   - `localStorage`にもプレイヤー名を保存するように改善

## 概要

プレイヤーの戦績（統計情報）は、**ブラウザのローカルストレージ（localStorage）**に保存されます。サーバー側には保存されず、各プレイヤーのブラウザにのみ保存されます。

## 保存場所

### 1. 戦績データ
- **キー**: `poker_player_stats`
- **場所**: ブラウザのローカルストレージ（`localStorage`）
- **形式**: JSON文字列

### 2. プレイヤー名リスト
- **キー**: `poker_player_names`
- **場所**: ブラウザのローカルストレージ（`localStorage`）
- **形式**: JSON配列（最大10件）

### 3. 最後に使用したプレイヤー名
- **キー**: `last_player_name`
- **場所**: ブラウザのローカルストレージ（`localStorage`）
- **形式**: 文字列

## データ構造

### 戦績データ（`poker_player_stats`）

```javascript
{
  "プレイヤー名1": {
    "totalGames": 5,        // 総対戦数
    "wins": 3,              // 勝利数
    "losses": 2,            // 敗北数
    "draws": 0,             // 引き分け数
    "hands": {              // 出した役の回数
      "ハイカード": 1,
      "ワンペア": 2,
      "ツーペア": 1,
      "スリーカード": 1
    }
  },
  "プレイヤー名2": {
    "totalGames": 3,
    "wins": 1,
    "losses": 2,
    "draws": 0,
    "hands": {
      "ハイカード": 2,
      "ワンペア": 1
    }
  }
}
```

## 保存方法

### 1. 戦績の更新タイミング

戦績は、**ゲーム結果画面が表示される時**（`game_result`イベント受信時）に更新されます。

**処理フロー**:
1. サーバーから`game_result`イベントを受信
2. `showResultScreen()`関数が呼ばれる
3. プレイヤー名を取得（複数のソースから試行）
4. `updatePlayerStats()`関数で統計情報を更新
5. `localStorage.setItem('poker_player_stats', JSON.stringify(allStats))`で保存

### 2. プレイヤー名の取得方法

ゲーム結果時に、以下の優先順位でプレイヤー名を取得します：

```javascript
const playerNameForStats = 
  data.player_name ||                           // 1. サーバーから返されたプレイヤー名
  data.your_result?.player_name ||              // 2. 結果データ内のプレイヤー名
  currentPlayerName ||                          // 3. 現在のプレイヤー名（グローバル変数）
  localStorage.getItem('last_player_name') ||   // 4. 最後に使用したプレイヤー名
  '';                                           // 5. 空文字（取得失敗時）
```

### 3. プレイヤー名の保存タイミング

プレイヤー名は以下のタイミングで`localStorage`に保存されます：

- **ルーム作成時**: `create-room-btn`クリック時
- **ルーム参加時**: `join-room-btn`クリック時
- **ルーム作成成功時**: `room_created`イベント受信時
- **ルーム参加成功時**: `room_joined`イベント受信時
- **ゲーム結果受信時**: `game_result`イベント受信時（`data.player_name`または`data.your_result.player_name`がある場合）

## 関連コード

### 戦績更新処理

**ファイル**: `frontend/js/game.js`

**関数**: `updatePlayerStats(playerName, gameResult)`

```javascript
function updatePlayerStats(playerName, gameResult) {
    // 1. 既存の統計情報を取得
    const stats = getPlayerStats(playerName);
    
    // 2. 対戦数を増やす
    stats.totalGames = (stats.totalGames || 0) + 1;
    
    // 3. 勝敗を更新
    if (gameResult.winner === 'you') {
        stats.wins = (stats.wins || 0) + 1;
    } else if (gameResult.winner === 'opponent') {
        stats.losses = (stats.losses || 0) + 1;
    } else {
        stats.draws = (stats.draws || 0) + 1;
    }
    
    // 4. 出した役を記録
    const handName = gameResult.your_result.hand_result.hand_name;
    if (!stats.hands) {
        stats.hands = {};
    }
    stats.hands[handName] = (stats.hands[handName] || 0) + 1;
    
    // 5. ローカルストレージに保存
    const allStats = getAllPlayerStats();
    allStats[playerName] = stats;
    localStorage.setItem('poker_player_stats', JSON.stringify(allStats));
}
```

### 戦績取得処理

**関数**: `getPlayerStats(playerName)`

```javascript
function getPlayerStats(playerName) {
    const allStats = getAllPlayerStats();
    return allStats[playerName] || {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        hands: {}
    };
}
```

**関数**: `getAllPlayerStats()`

```javascript
function getAllPlayerStats() {
    const saved = localStorage.getItem('poker_player_stats');
    if (saved) {
        return JSON.parse(saved);
    }
    return {};
}
```

## サーバー側の処理

**ファイル**: `backend/app.py`

サーバー側では、ゲーム結果を送信する際にプレイヤー名を含めます：

```python
for socket_id in game.players:
    player = game.players[socket_id]
    result_data = {
        'your_result': game.results[socket_id],
        'opponent_result': game.results[[sid for sid in game.players.keys() if sid != socket_id][0]],
        'winner': 'you' if winner_id == socket_id else ('opponent' if winner_id != 'draw' else 'draw'),
        'game_state': game.get_state(),
        'player_name': player['name']  # プレイヤー名を含める
    }
    socketio.emit('game_result', result_data, room=socket_id)
```

## ログ出力

### ログ出力の概要

戦績機能に関連するログは、**ブラウザのコンソール（開発者ツール）**に出力されます。サーバー側のログは、**EC2インスタンスのsystemdログ**（`journalctl -u poker-game`）に出力されます。

### クライアント側のログ

戦績更新時に以下のログが出力されます：

1. **ゲーム結果受信時**:
   ```javascript
   console.log('ゲーム結果受信:', {
       'data.player_name': data.player_name,
       'data.your_result.player_name': data.your_result?.player_name,
       'currentPlayerName': currentPlayerName,
       'localStorage.last_player_name': localStorage.getItem('last_player_name'),
       'playerNameForStats': playerNameForStats,
       'winner': data.winner
   });
   ```

2. **統計情報更新開始時**:
   ```javascript
   console.log('=== 統計情報更新開始 ===');
   console.log('プレイヤー名:', playerName);
   console.log('勝敗:', gameResult.winner);
   console.log('手札:', gameResult.your_result.hand_result.hand_name);
   ```

3. **更新前の統計情報**:
   ```javascript
   console.log('更新前の統計:', JSON.parse(JSON.stringify(stats)));
   ```

4. **各項目の更新**:
   ```javascript
   console.log('対戦数:', beforeTotalGames, '→', stats.totalGames);
   console.log('勝利数:', beforeWins, '→', stats.wins);
   console.log('敗北数:', beforeLosses, '→', stats.losses);
   console.log('役「' + handName + '」:', beforeHandCount, '→', stats.hands[handName]);
   ```

5. **保存前の全統計**:
   ```javascript
   console.log('保存前の全統計:', Object.keys(allStats));
   ```

6. **保存後の統計情報**:
   ```javascript
   console.log('保存後の統計:', JSON.parse(JSON.stringify(savedStats)));
   console.log('=== 統計情報更新完了 ===');
   ```

7. **統計情報取得時**:
   ```javascript
   console.log('統計情報を取得:', { playerName, stats: JSON.parse(JSON.stringify(stats)) });
   console.log('全統計情報を取得:', Object.keys(stats));
   ```

8. **ルーム作成/参加時**:
   ```javascript
   console.log('ルーム作成: currentPlayerNameを設定:', currentPlayerName);
   console.log('ルーム参加: currentPlayerNameを設定:', currentPlayerName);
   console.log('ルーム作成ボタンクリック: currentPlayerNameを設定:', currentPlayerName);
   console.log('ルーム参加ボタンクリック: currentPlayerNameを設定:', currentPlayerName);
   ```

9. **エラー時**:
   ```javascript
   console.error('統計情報を更新できません: プレイヤー名が取得できませんでした', { ... });
   console.error('統計情報更新エラー:', e);
   console.warn('ルーム作成: data.player_nameが存在しません', data);
   console.warn('ルーム参加: data.player_nameが存在しません', data);
   ```

### サーバー側のログ

**ファイル**: `backend/app.py`

**ログ出力場所**: EC2インスタンスのsystemdログ（`journalctl -u poker-game -f`でリアルタイム確認可能）

```python
print(f'ゲーム結果を送信: socket_id={socket_id}, player_name={player["name"]}, winner={winner_status}')
```

**ログ内容**:
- `socket_id`: プレイヤーのソケットID
- `player_name`: プレイヤー名
- `winner`: 勝敗結果（'you', 'opponent', 'draw'）

### ログの確認方法

#### クライアント側（ブラウザ）
1. ブラウザの開発者ツールを開く（F12キー）
2. 「Console」タブを選択
3. ゲーム結果画面が表示されるタイミングでログを確認

#### サーバー側（EC2）
```bash
# リアルタイムでログを確認
sudo journalctl -u poker-game -f

# 最新の100行を表示
sudo journalctl -u poker-game -n 100

# 特定のキーワードで検索
sudo journalctl -u poker-game | grep "ゲーム結果を送信"
```

## 注意事項

### 1. ブラウザ依存
- 戦績は各ブラウザのローカルストレージに保存されるため、**ブラウザを変更すると戦績は引き継がれません**
- 同じブラウザでも、**プライベートモードやシークレットモードでは保存されません**

### 2. データの永続性
- ローカルストレージのデータは、**ブラウザのキャッシュをクリアすると削除されます**
- **ブラウザの設定でローカルストレージを無効にしている場合は保存されません**

### 3. プレイヤー名の一意性
- プレイヤー名がキーとして使用されるため、**同じプレイヤー名で複数のアカウントを作成すると、戦績が上書きされます**
- 大文字小文字は区別されます（例: "Player1" と "player1" は別のキー）

### 4. データの整合性
- サーバー側では戦績を管理していないため、**クライアント側でデータを改ざんすることが可能です**
- 本番環境では、サーバー側で戦績を管理することを推奨します

## トラブルシューティング

### 戦績が更新されない場合

1. **ブラウザのコンソールを確認**
   - エラーログがないか確認
   - プレイヤー名が正しく取得されているか確認

2. **ローカルストレージを確認**
   - ブラウザの開発者ツールで`localStorage.getItem('poker_player_stats')`を実行
   - データが正しく保存されているか確認

3. **プレイヤー名の確認**
   - ゲーム結果時に、どのソースからプレイヤー名が取得されたかログで確認
   - `currentPlayerName`が正しく設定されているか確認

### 戦績が消えた場合

1. **ブラウザのキャッシュをクリアしていないか確認**
2. **別のブラウザでアクセスしていないか確認**
3. **プライベートモードでアクセスしていないか確認**

## これまでの問題と解決策

### 問題1: 参加プレイヤーの統計情報が記録されない

**症状**: ルームを作成したプレイヤーの統計は正しく記録されるが、参加したプレイヤーの統計が記録されないことがある

**原因**: 
- `game_result`イベントにプレイヤー名が含まれていなかった
- クライアント側で`currentPlayerName`が正しく設定されていない場合があった

**解決策**:
1. サーバー側で`game_result`イベントに`player_name`を含めるように修正
2. クライアント側で複数のソースからプレイヤー名を取得するように改善
3. `localStorage`に`last_player_name`を保存し、フォールバックとして使用

### 問題2: プレイヤーA（ルーム作成者）の統計が更新されない

**症状**: プレイヤーAがルームを作成し、プレイヤーBが参加した場合、Aの統計が更新されない

**原因**: 
- ゲーム結果時にプレイヤー名が取得できていない可能性
- `currentPlayerName`がリセットされている可能性

**解決策**:
1. 詳細なログを追加して問題を特定
2. 複数のソースからプレイヤー名を取得するように改善
3. `localStorage`に`last_player_name`を保存し、確実にプレイヤー名を保持

## 今後の改善案

1. **サーバー側での戦績管理**
   - データベースに戦績を保存
   - ユーザー認証と紐付け

2. **データのエクスポート/インポート機能**
   - JSON形式で戦績をエクスポート
   - 別のブラウザやデバイスにインポート

3. **戦績のバックアップ機能**
   - 定期的にクラウドストレージにバックアップ

4. **戦績の共有機能**
   - 他のプレイヤーと戦績を共有

