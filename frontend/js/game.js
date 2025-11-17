/**
 * オンライン対戦ポーカー - クライアント側JavaScript
 */

// グローバル変数
let socket;
let currentRoomId = null;
let playerHand = [];
let selectedCards = [];
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
        playerHand = data.hand;
        gamePhase = 'draw_phase';
        showScreen('game-screen');
        renderPlayerCards();
        enableExchangeButtons();
        showStatus('カードが配られました。交換するカードを選んでください。', 'info');
    });

    // カード交換完了
    socket.on('cards_exchanged', (data) => {
        playerHand = data.hand;
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
        if (selectedCards.length === 0) {
            showStatus('交換するカードを選択してください', 'warning');
            return;
        }
        
        socket.emit('exchange_cards', {
            room_id: currentRoomId,
            card_indices: selectedCards
        });
        
        selectedCards = [];
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
 * プレイヤーのカードを描画
 */
function renderPlayerCards() {
    const container = document.getElementById('player-cards');
    container.innerHTML = '';
    
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
            toggleCardSelection(cardDiv, index);
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
 * カード選択のトグル
 */
function toggleCardSelection(cardElement, index) {
    if (selectedCards.includes(index)) {
        selectedCards = selectedCards.filter(i => i !== index);
        cardElement.classList.remove('selected');
    } else {
        if (selectedCards.length < 5) {
            selectedCards.push(index);
            cardElement.classList.add('selected');
        }
    }
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
    gamePhase = 'lobby';
    document.getElementById('player-cards').innerHTML = '';
}

