/**
 * オンライン対戦ポーカー - クライアント側JavaScript
 */

// グローバル変数
let socket;
let currentRoomId = null;
let playerHand = [];
let selectedCards = [];
let selectedCardIds = []; // 選択されたカードのIDを保存（並び替え対応）
let gamePhase = 'lobby';

// サーバーのURL（本番環境では適切に設定）
const SERVER_URL = window.location.origin;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    setupEventListeners();
});

/**
 * Socket.IO接続の初期化
 */
function initializeSocket() {
    socket = io(SERVER_URL);

    // 接続イベント
    socket.on('connected', (data) => {
        console.log('サーバーに接続しました', data);
        showStatus('サーバーに接続しました', 'success');
    });

    // ルーム作成成功
    socket.on('room_created', (data) => {
        currentRoomId = data.room_id;
        showRoomInfo(data.room_id, data.game_state);
        showStatus(`ルーム ${data.room_id} を作成しました`, 'success');
    });

    // ルーム参加成功
    socket.on('room_joined', (data) => {
        currentRoomId = data.room_id;
        showRoomInfo(data.room_id, data.game_state);
        showStatus(`ルーム ${data.room_id} に参加しました`, 'success');
    });

    // プレイヤー参加通知
    socket.on('player_joined', (gameState) => {
        updatePlayersList(gameState);
        showStatus('プレイヤーが参加しました', 'info');
        
        // 2人揃ったらゲーム開始ボタンを表示
        if (gameState.player_count === 2) {
            document.getElementById('start-game-btn').classList.remove('hidden');
        }
    });

    // プレイヤー退出通知
    socket.on('player_left', (gameState) => {
        updatePlayersList(gameState);
        showStatus('プレイヤーが退出しました', 'warning');
        document.getElementById('start-game-btn').classList.add('hidden');
    });

    // カード配布
    socket.on('cards_dealt', (data) => {
        playerHand = sortHand(data.hand); // 自動並び替え
        selectedCardIds = []; // 選択をリセット
        gamePhase = 'draw_phase';
        showScreen('game-screen');
        renderPlayerCards();
        enableExchangeButtons();
        showStatus('カードが配られました。交換するカードを選んでください。', 'info');
    });

    // カード交換完了
    socket.on('cards_exchanged', (data) => {
        console.log('cards_exchanged イベント受信:', data);
        console.log('交換後の手札（並び替え前）:', data.hand);
        playerHand = sortHand(data.hand); // 自動並び替え
        console.log('並び替え後のplayerHand:', playerHand);
        selectedCardIds = []; // 選択をリセット
        renderPlayerCards();
        disableExchangeButtons();
        showStatus('カード交換完了。相手の交換を待っています...', 'info');
    });

    // 相手待ち
    socket.on('waiting_for_opponent', (gameState) => {
        showStatus('相手の交換を待っています...', 'info');
    });

    // ゲーム結果
    socket.on('game_result', (data) => {
        gamePhase = 'result';
        showResultScreen(data);
    });

    // ゲームリセット
    socket.on('game_reset', (gameState) => {
        resetGame();
        showScreen('lobby-screen');
        showRoomInfo(currentRoomId, gameState);
        showStatus('ゲームがリセットされました', 'info');
    });

    // エラー
    socket.on('error', (data) => {
        showStatus(data.message, 'error');
    });

    // 切断
    socket.on('disconnect', () => {
        showStatus('サーバーから切断されました', 'error');
    });
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // ルーム作成
    document.getElementById('create-room-btn').addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value.trim() || 'Player1';
        socket.emit('create_room', { player_name: playerName });
    });

    // ルーム参加
    document.getElementById('join-room-btn').addEventListener('click', () => {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        const playerName = document.getElementById('player-name').value.trim() || 'Player2';
        
        if (!roomId || roomId.length !== 6) {
            showStatus('6桁のルームIDを入力してください', 'error');
            return;
        }
        
        socket.emit('join_room', { room_id: roomId, player_name: playerName });
    });

    // ルームIDコピー
    document.getElementById('copy-room-id').addEventListener('click', () => {
        const roomId = document.getElementById('current-room-id').textContent;
        navigator.clipboard.writeText(roomId).then(() => {
            showStatus('ルームIDをコピーしました', 'success');
        });
    });

    // ゲーム開始
    document.getElementById('start-game-btn').addEventListener('click', () => {
        socket.emit('start_game', { room_id: currentRoomId });
    });

    // カード交換
    document.getElementById('exchange-btn').addEventListener('click', () => {
        const indices = getSelectedCardIndices();
        if (indices.length === 0) {
            showStatus('交換するカードを選択してください', 'warning');
            return;
        }
        
        socket.emit('exchange_cards', {
            room_id: currentRoomId,
            card_indices: indices
        });
        
        selectedCardIds = [];
    });

    // 交換しない
    document.getElementById('skip-exchange-btn').addEventListener('click', () => {
        socket.emit('exchange_cards', {
            room_id: currentRoomId,
            card_indices: []
        });
    });

    // もう一度プレイ
    document.getElementById('play-again-btn').addEventListener('click', () => {
        socket.emit('reset_game', { room_id: currentRoomId });
    });

    // ルーム退出
    document.getElementById('leave-room-btn').addEventListener('click', () => {
        location.reload();
    });
}

/**
 * ルーム情報を表示
 */
function showRoomInfo(roomId, gameState) {
    document.getElementById('room-info').classList.remove('hidden');
    document.getElementById('current-room-id').textContent = roomId;
    updatePlayersList(gameState);
}

/**
 * プレイヤーリストを更新
 */
function updatePlayersList(gameState) {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '<h4>参加プレイヤー:</h4>';
    
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.textContent = `${player.name} (Player ${player.player_number})`;
        playersList.appendChild(playerDiv);
    });
}

/**
 * 手札を自動的に並び替える
 * ペアを左側に、残りを数字の小さい順に配置
 * Aは1として扱い、A2345の順番にする
 */
function sortHand(cards) {
    if (!cards || cards.length === 0) {
        return [];
    }
    
    // カードをコピー
    const sortedCards = [...cards];
    
    // Aを1として扱うための値を取得する関数
    const getSortValue = (card) => {
        // A（value=14）を1として扱う
        return card.value === 14 ? 1 : card.value;
    };
    
    // デバッグ: 元のカードを表示
    console.log('並び替え前:', sortedCards.map(c => `${c.label}(${c.value})`));
    
    // 1. 数字の値でグループ化（Aは1として扱う）
    const valueGroups = {};
    sortedCards.forEach(card => {
        const sortValue = getSortValue(card);
        if (!valueGroups[sortValue]) {
            valueGroups[sortValue] = [];
        }
        valueGroups[sortValue].push(card);
    });
    
    // 2. ペアと単独カードを分離
    const pairs = [];
    const singles = [];
    
    // 数値キーでソートしてから処理
    const sortedKeys = Object.keys(valueGroups).map(k => parseInt(k)).sort((a, b) => a - b);
    
    sortedKeys.forEach(sortValue => {
        const group = valueGroups[sortValue];
        if (group.length >= 2) {
            // ペア以上がある場合、スートでソート
            group.sort((a, b) => {
                const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
                return suitOrder[a.suit] - suitOrder[b.suit];
            });
            pairs.push(...group);
        } else {
            singles.push(...group);
        }
    });
    
    // 3. ペアを数字の小さい順にソート（Aは1として扱う）
    pairs.sort((a, b) => {
        const aSortValue = getSortValue(a);
        const bSortValue = getSortValue(b);
        
        // まず、ペアの種類で比較（トリプル > ペア）
        // valueGroupsのキーは文字列として扱われるので、数値キーでアクセス
        const aGroup = valueGroups[aSortValue] || valueGroups[String(aSortValue)];
        const bGroup = valueGroups[bSortValue] || valueGroups[String(bSortValue)];
        if (aGroup && bGroup && aGroup.length !== bGroup.length) {
            return bGroup.length - aGroup.length;
        }
        
        // 同じ種類のペアの場合、数字で比較（Aは1として扱う）
        if (aSortValue !== bSortValue) {
            return aSortValue - bSortValue; // 数字の小さい順（A=1）
        }
        // 同じ数字の場合はスートでソート
        const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
        return suitOrder[a.suit] - suitOrder[b.suit];
    });
    
    // 4. 単独カードを数字の小さい順にソート（Aは1として扱う）
    singles.sort((a, b) => {
        const aSortValue = getSortValue(a);
        const bSortValue = getSortValue(b);
        if (aSortValue !== bSortValue) {
            return aSortValue - bSortValue; // 数字の小さい順（A=1）
        }
        // 同じ数字の場合はスートでソート
        const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
        return suitOrder[a.suit] - suitOrder[b.suit];
    });
    
    // 5. ペアを左側に、単独カードを右側に配置
    const result = [...pairs, ...singles];
    
    // デバッグ: 並び替え後のカードを表示
    console.log('並び替え後:', result.map(c => `${c.label}(${getSortValue(c)})`));
    
    return result;
}

/**
 * プレイヤーのカードを描画
 */
function renderPlayerCards() {
    const container = document.getElementById('player-cards');
    if (!container) {
        console.error('player-cards コンテナが見つかりません');
        return;
    }
    container.innerHTML = '';
    
    console.log('renderPlayerCards: playerHand =', playerHand);
    
    playerHand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        container.appendChild(cardElement);
    });
}

/**
 * カード要素を作成
 */
function createCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.index = index;
    // 一意のIDを生成（並び替え後も追跡可能）
    const cardId = `${card.suit}-${card.value}-${index}`;
    cardDiv.dataset.cardId = cardId;
    
    // 既に選択されている場合はselectedクラスを追加
    if (selectedCardIds.includes(cardId)) {
        cardDiv.classList.add('selected');
    }
    
    // スートの色
    const color = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
    cardDiv.classList.add(color);
    
    // カードの表示
    cardDiv.innerHTML = `
        <div class="card-corner top-left">
            <div class="card-value">${card.label}</div>
            <div class="card-suit">${card.suit}</div>
        </div>
        <div class="card-center">${card.suit}</div>
        <div class="card-corner bottom-right">
            <div class="card-value">${card.label}</div>
            <div class="card-suit">${card.suit}</div>
        </div>
    `;
    
    // クリックイベント
    cardDiv.addEventListener('click', () => {
        if (gamePhase === 'draw_phase') {
            toggleCardSelection(cardDiv, cardId);
        }
    });
    
    return cardDiv;
}

/**
 * カードバック要素を作成
 */
function createCardBackElement() {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card card-back';
    cardDiv.innerHTML = '<div class="card-back-pattern"></div>';
    return cardDiv;
}

/**
 * カード選択のトグル（並び替え対応版）
 */
function toggleCardSelection(cardElement, cardId) {
    const index = selectedCardIds.indexOf(cardId);
    
    if (index === -1) {
        // 選択されていない場合、選択に追加
        if (selectedCardIds.length < 5) {
            selectedCardIds.push(cardId);
            cardElement.classList.add('selected');
        }
    } else {
        // 選択されている場合、選択から削除
        selectedCardIds.splice(index, 1);
        cardElement.classList.remove('selected');
    }
}

/**
 * 選択されたカードのインデックスを取得
 */
function getSelectedCardIndices() {
    return selectedCardIds.map(cardId => {
        // cardIdから元のインデックスを取得
        const parts = cardId.split('-');
        const suit = parts[0];
        const value = parseInt(parts[1]);
        
        // 現在のplayerHandから該当するカードのインデックスを探す
        return playerHand.findIndex(card => 
            card.suit === suit && card.value === value
        );
    }).filter(index => index !== -1);
}

/**
 * 交換ボタンを有効化
 */
function enableExchangeButtons() {
    document.getElementById('exchange-btn').disabled = false;
    document.getElementById('skip-exchange-btn').disabled = false;
}

/**
 * 交換ボタンを無効化
 */
function disableExchangeButtons() {
    document.getElementById('exchange-btn').disabled = true;
    document.getElementById('skip-exchange-btn').disabled = true;
}

/**
 * 結果画面を表示
 */
function showResultScreen(data) {
    showScreen('result-screen');
    
    // 勝敗を表示
    const resultTitle = document.getElementById('result-title');
    if (data.winner === 'you') {
        resultTitle.textContent = '🎉 あなたの勝ち！';
        resultTitle.className = 'win';
    } else if (data.winner === 'opponent') {
        resultTitle.textContent = '😢 あなたの負け';
        resultTitle.className = 'lose';
    } else {
        resultTitle.textContent = '🤝 引き分け';
        resultTitle.className = 'draw';
    }
    
    // あなたの手札
    const yourCardsContainer = document.getElementById('your-result-cards');
    yourCardsContainer.innerHTML = '';
    data.your_result.hand.forEach(card => {
        yourCardsContainer.appendChild(createCardElement(card, -1));
    });
    document.getElementById('your-hand-name').textContent = data.your_result.hand_result.hand_name;
    
    // 相手の手札
    const opponentCardsContainer = document.getElementById('opponent-result-cards');
    opponentCardsContainer.innerHTML = '';
    data.opponent_result.hand.forEach(card => {
        opponentCardsContainer.appendChild(createCardElement(card, -1));
    });
    document.getElementById('opponent-hand-name').textContent = data.opponent_result.hand_result.hand_name;
}

/**
 * 画面を切り替え
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

/**
 * ステータスメッセージを表示
 */
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type} show`;
    
    setTimeout(() => {
        statusElement.classList.remove('show');
    }, 3000);
}

/**
 * ゲームをリセット
 */
function resetGame() {
    playerHand = [];
    selectedCards = [];
    selectedCardIds = [];
    gamePhase = 'lobby';
    document.getElementById('player-cards').innerHTML = '';
}

