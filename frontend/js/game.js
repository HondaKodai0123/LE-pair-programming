/**
 * オンライン対戦ポーカー - クライアント側JavaScript
 */

// グローバル変数
let socket;
let currentRoomId = null;
let playerHand = [];
let playerHandBeforeExchange = []; // 交換前の手札
let selectedCards = [];
let selectedCardIds = []; // 選択されたカードのIDを保存（並び替え対応）
let selectedCardIndices = []; // 選択されたカードのインデックスを直接保存
let gamePhase = 'lobby';
let currentPlayerName = ''; // 現在のプレイヤー名
let maxExchanges = null; // 最大交換回数
let currentExchangeRound = 0; // 現在の交換ラウンド
let isRoomCreator = false; // ルーム作成者かどうか

// サーバーのURL（本番環境では適切に設定）
const SERVER_URL = window.location.origin;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // 既存のlocalStorageの戦績をリセット（サーバー側管理に移行）
    if (localStorage.getItem('poker_player_stats')) {
        console.log('既存のlocalStorageの戦績をリセットします（サーバー側管理に移行）');
        localStorage.removeItem('poker_player_stats');
    }
    
    initializeSocket();
    setupEventListeners();
    loadPlayerNames();
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
        isRoomCreator = true; // ルーム作成者としてマーク
        // サーバーから返されたプレイヤー名を設定（確実に設定するため）
        if (data.player_name) {
            currentPlayerName = data.player_name;
            localStorage.setItem('last_player_name', data.player_name);
            console.log('ルーム作成: currentPlayerNameを設定:', currentPlayerName);
        } else {
            console.warn('ルーム作成: data.player_nameが存在しません', data);
        }
        showRoomInfo(data.room_id, data.game_state);
        showStatus(`ルーム ${data.room_id} を作成しました`, 'success');
    });

    // ルーム参加成功
    socket.on('room_joined', (data) => {
        currentRoomId = data.room_id;
        isRoomCreator = false; // ルーム参加者としてマーク
        // サーバーから返されたプレイヤー名を設定（確実に設定するため）
        if (data.player_name) {
            currentPlayerName = data.player_name;
            localStorage.setItem('last_player_name', data.player_name);
            console.log('ルーム参加: currentPlayerNameを設定:', currentPlayerName);
        } else {
            console.warn('ルーム参加: data.player_nameが存在しません', data);
        }
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
        playerHandBeforeExchange = [...playerHand]; // 初期手札を交換前の手札として保存
        selectedCardIds = []; // 選択をリセット
        selectedCardIndices = []; // 選択をリセット
        gamePhase = 'draw_phase';
        showScreen('game-screen');
        
        // 交換回数情報を設定
        if (data.max_exchanges !== undefined) {
            maxExchanges = data.max_exchanges;
            currentExchangeRound = data.current_exchange_round || 1;
            updateExchangeRoundDisplay();
        }
        
        // 残りのカード枚数を表示
        if (data.remaining_cards !== undefined) {
            updateRemainingCards(data.remaining_cards);
        }
        
        // 残りのカードリストを表示
        if (data.remaining_cards_list !== undefined) {
            renderRemainingCards(data.remaining_cards_list);
        }
        
        // 山札からカードを配るアニメーション
        dealCardsFromDeck(data.hand);
    });

    // カード交換完了
    socket.on('cards_exchanged', (data) => {
        console.log('cards_exchanged イベント受信:', data);
        console.log('交換後の手札（並び替え前）:', data.hand);
        
        // 交換回数情報を更新
        if (data.current_exchange_round !== undefined) {
            currentExchangeRound = data.current_exchange_round;
            updateExchangeRoundDisplay();
        }
        
        // 交換前の手札を保存（まだ保存されていない場合）
        if (playerHandBeforeExchange.length === 0) {
            playerHandBeforeExchange = [...playerHand];
        }
        
        // アニメーション: 既存のカードをフェードアウト
        const container = document.getElementById('player-cards');
        if (container) {
            const existingCards = container.querySelectorAll('.card');
            existingCards.forEach((card, index) => {
                card.classList.add('fade-out');
            });
            
            // フェードアウト後に新しいカードを表示
            setTimeout(() => {
                playerHand = sortHand(data.hand); // 自動並び替え
                console.log('並び替え後のplayerHand:', playerHand);
                selectedCardIds = []; // 選択をリセット
                selectedCardIndices = []; // 選択をリセット
                
                // 残りのカード枚数を更新
                if (data.remaining_cards !== undefined) {
                    updateRemainingCards(data.remaining_cards);
                }
                
                // 残りのカードリストを更新
                if (data.remaining_cards_list !== undefined) {
                    renderRemainingCards(data.remaining_cards_list);
                }
                
                renderPlayerCardsWithAnimation(); // アニメーション付きで描画
                renderPlayerCardsBefore(); // 交換前の手札を表示
                disableExchangeButtons();
                showStatus('カード交換完了。相手の交換を待っています...', 'info');
            }, 300); // フェードアウトアニメーションの時間
        } else {
            // コンテナがない場合は通常通り処理
            playerHand = sortHand(data.hand);
            selectedCardIds = [];
            selectedCardIndices = [];
            
            // 残りのカード枚数を更新
            if (data.remaining_cards !== undefined) {
                updateRemainingCards(data.remaining_cards);
            }
            
            // 残りのカードリストを更新
            if (data.remaining_cards_list !== undefined) {
                renderRemainingCards(data.remaining_cards_list);
            }
            
            renderPlayerCards();
            renderPlayerCardsBefore();
            disableExchangeButtons();
            showStatus('カード交換完了。相手の交換を待っています...', 'info');
        }
    });

    // 相手待ち
    socket.on('waiting_for_opponent', (gameState) => {
        showStatus('相手の交換を待っています...', 'info');
    });

    // 全員の交換完了
    socket.on('all_players_ready', (data) => {
        const message = data.message || '全員の交換が完了しました。結果を表示します...';
        showStatus(message, 'info');
        console.log('全員の交換完了:', data);
    });

    // 交換回数選択を促す
    socket.on('select_exchange_count', (data) => {
        console.log('交換回数選択を促す:', data);
        showExchangeCountModal();
    });

    // 次の交換ラウンド開始
    socket.on('next_exchange_round', (data) => {
        console.log('次の交換ラウンド開始:', data);
        currentExchangeRound = data.current_round || 0;
        showStatus(data.message || `第${data.current_round}回目の交換を開始してください`, 'info');
        // 交換ボタンを再有効化
        enableExchangeButtons();
        // 選択をリセット
        selectedCardIds = [];
        selectedCardIndices = [];
        // 手札を再表示（選択可能な状態に）
        renderPlayerCards();
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
        console.error('サーバーエラー:', data);
        showStatus(data.message || 'エラーが発生しました', 'error');
    });

    // 切断
    socket.on('disconnect', () => {
        showStatus('サーバーから切断されました', 'error');
    });

    // 戦績取得レスポンス
    socket.on('stats_response', (data) => {
        console.log('戦績を取得:', data);
        cachedStats[data.player_name] = data.stats;
        // 統計モーダルが表示されている場合は更新
        if (document.getElementById('stats-modal')?.style.display === 'block') {
            showStatsModal();
        }
    });

    // 全戦績取得レスポンス
    socket.on('all_stats_response', (data) => {
        console.log('全戦績を取得:', data);
        cachedAllStats = data.stats || {};
        // 全プレイヤーの役の記録モーダルが表示されている場合は更新
        const allPlayersHandsModal = document.getElementById('all-players-hands-modal');
        if (allPlayersHandsModal && allPlayersHandsModal.classList.contains('show')) {
            // 全プレイヤーの役の記録を更新
            displayAllPlayersHandsRecords();
        }
    });

    // 戦績リセットレスポンス
    socket.on('stats_reset_response', (data) => {
        console.log('戦績をリセット:', data);
        showStatus(data.message, 'success');
        // キャッシュをクリア
        cachedStats = {};
        cachedAllStats = {};
        // 統計モーダルが表示されている場合は更新
        if (document.getElementById('stats-modal')?.style.display === 'block') {
            showStatsModal();
        }
    });
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // ルーム作成
    document.getElementById('create-room-btn').addEventListener('click', () => {
        const playerName = document.getElementById('player-name').value.trim() || 'Player1';
        currentPlayerName = playerName;
        localStorage.setItem('last_player_name', playerName);
        console.log('ルーム作成ボタンクリック: currentPlayerNameを設定:', currentPlayerName);
        if (playerName && playerName !== 'Player1') {
            savePlayerName(playerName);
        }
        socket.emit('create_room', { player_name: playerName });
    });

    // ルーム参加
    document.getElementById('join-room-btn').addEventListener('click', () => {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        const playerName = document.getElementById('player-name').value.trim() || 'Player2';
        currentPlayerName = playerName;
        localStorage.setItem('last_player_name', playerName);
        console.log('ルーム参加ボタンクリック: currentPlayerNameを設定:', currentPlayerName);
        
        if (!roomId || roomId.length !== 6) {
            showStatus('6桁のルームIDを入力してください', 'error');
            return;
        }
        
        if (playerName && playerName !== 'Player2') {
            savePlayerName(playerName);
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
        console.log('交換ボタンクリック');
        console.log('選択中のカードID:', selectedCardIds);
        console.log('現在のplayerHand:', playerHand);
        
        // 交換前の手札を保存（まだ保存されていない場合）
        if (playerHandBeforeExchange.length === 0) {
            playerHandBeforeExchange = [...playerHand];
        }
        // 交換前の手札を選択不可の状態で表示
        renderPlayerCardsBefore();
        
        const indices = getSelectedCardIndices();
        console.log('取得したインデックス:', indices);
        
        if (indices.length === 0) {
            showStatus('交換するカードを選択してください', 'warning');
            return;
        }
        
        // インデックスに対応するカードを確認
        const cardsToExchange = indices.map(idx => {
            if (idx >= 0 && idx < playerHand.length) {
                return playerHand[idx];
            }
            return null;
        }).filter(card => card !== null);
        
        console.log('交換するカード:', cardsToExchange.map(c => `${c.label}${c.suit}`));
        
        socket.emit('exchange_cards', {
            room_id: currentRoomId,
            card_indices: indices
        });
        
        selectedCardIds = [];
        selectedCardIndices = [];
    });

    // 全て交換
    document.getElementById('exchange-all-btn').addEventListener('click', () => {
        // 交換前の手札を保存（まだ保存されていない場合）
        if (playerHandBeforeExchange.length === 0) {
            playerHandBeforeExchange = [...playerHand];
        }
        // 交換前の手札を選択不可の状態で表示
        renderPlayerCardsBefore();
        
        // 全てのカードのインデックス（0, 1, 2, 3, 4）
        const allIndices = playerHand.map((_, index) => index);
        
        socket.emit('exchange_cards', {
            room_id: currentRoomId,
            card_indices: allIndices
        });
        
        selectedCardIds = [];
        selectedCardIndices = [];
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

    // 役と確率の一覧表を表示（ルーム作成画面）
    document.getElementById('show-hands-lobby-btn').addEventListener('click', () => {
        showHandsModal();
    });

    // 役と確率の一覧表を表示（ゲーム画面）
    document.getElementById('show-hands-game-btn').addEventListener('click', () => {
        showHandsModal();
    });

    // モーダルを閉じる
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        closeHandsModal();
    });

    // モーダルの背景をクリックして閉じる
    document.getElementById('hands-modal').addEventListener('click', (e) => {
        if (e.target.id === 'hands-modal') {
            closeHandsModal();
        }
    });

    // 統計情報を表示
    document.getElementById('show-stats-btn').addEventListener('click', () => {
        showStatsModal();
    });

    // 統計モーダルを閉じる
    document.getElementById('close-stats-modal-btn').addEventListener('click', () => {
        closeStatsModal();
    });

    // 統計モーダルの背景をクリックして閉じる
    document.getElementById('stats-modal').addEventListener('click', (e) => {
        if (e.target.id === 'stats-modal') {
            closeStatsModal();
        }
    });

    // 戦績リセットボタン
    document.getElementById('reset-stats-btn').addEventListener('click', () => {
        if (confirm('戦績をリセットしますか？この操作は取り消せません。')) {
            // サーバー側の戦績をリセット
            socket.emit('reset_stats', { player_name: currentPlayerName });
            // ローカルストレージの戦績もリセット
            localStorage.removeItem('poker_player_stats');
            cachedStats = {};
            cachedAllStats = {};
        }
    });

    // 全プレイヤーの役の記録を表示するボタン（ルーム作成画面）
    const showAllPlayersHandsBtn = document.getElementById('show-all-players-hands-btn');
    if (showAllPlayersHandsBtn) {
        showAllPlayersHandsBtn.addEventListener('click', () => {
            showAllPlayersHandsModal();
        });
    }

    // 全プレイヤーの役の記録モーダルを閉じるボタン
    const closeAllPlayersHandsModalBtn = document.getElementById('close-all-players-hands-modal-btn');
    if (closeAllPlayersHandsModalBtn) {
        closeAllPlayersHandsModalBtn.addEventListener('click', () => {
            closeAllPlayersHandsModal();
        });
    }

    // 全プレイヤーの役の記録モーダルの背景をクリックして閉じる
    const allPlayersHandsModal = document.getElementById('all-players-hands-modal');
    if (allPlayersHandsModal) {
        allPlayersHandsModal.addEventListener('click', (e) => {
            if (e.target.id === 'all-players-hands-modal') {
                closeAllPlayersHandsModal();
            }
        });
    }

    // 交換回数選択ボタン
    document.getElementById('select-exchange-1').addEventListener('click', () => {
        selectExchangeCount(1);
    });
    document.getElementById('select-exchange-2').addEventListener('click', () => {
        selectExchangeCount(2);
    });
    document.getElementById('select-exchange-3').addEventListener('click', () => {
        selectExchangeCount(3);
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
 * プレイヤーのカードを描画（アニメーション付き）
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
        // 選択状態を復元
        const cardId = `${card.suit}-${card.value}`;
        if (selectedCardIds.includes(cardId)) {
            cardElement.classList.add('selected');
            // インデックスも更新
            const idIndex = selectedCardIds.indexOf(cardId);
            if (idIndex !== -1 && idIndex < selectedCardIndices.length) {
                selectedCardIndices[idIndex] = index;
            } else if (idIndex !== -1) {
                selectedCardIndices.push(index);
            }
        }
        // アニメーション: カードを順番に表示
        cardElement.style.animationDelay = `${index * 0.1}s`;
        container.appendChild(cardElement);
    });
}

/**
 * プレイヤーのカードを描画（交換時のアニメーション付き）
 */
function renderPlayerCardsWithAnimation() {
    const container = document.getElementById('player-cards');
    if (!container) {
        console.error('player-cards コンテナが見つかりません');
        return;
    }
    container.innerHTML = '';
    
    console.log('renderPlayerCardsWithAnimation: playerHand =', playerHand);
    
    playerHand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        // フェードインアニメーションを適用
        cardElement.classList.add('fade-in');
        // アニメーション: カードを順番に表示
        cardElement.style.animationDelay = `${index * 0.1}s`;
        container.appendChild(cardElement);
    });
}

/**
 * 交換前のプレイヤーのカードを描画（選択不可）
 */
function renderPlayerCardsBefore() {
    const container = document.getElementById('player-cards-before');
    if (!container) {
        console.error('player-cards-before コンテナが見つかりません');
        return;
    }
    container.innerHTML = '';
    
    if (playerHandBeforeExchange.length === 0) {
        // 交換前の手札がない場合は空にする
        return;
    }
    
    console.log('renderPlayerCardsBefore: playerHandBeforeExchange =', playerHandBeforeExchange);
    
    playerHandBeforeExchange.forEach((card, index) => {
        // 交換前の手札は選択不可なので、クリックイベントなしのカード要素を作成
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.dataset.index = index;
        cardDiv.style.opacity = '0.7'; // 少し薄く表示
        
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
        
        container.appendChild(cardDiv);
    });
}

/**
 * 山札からカードを配るアニメーション
 */
function dealCardsFromDeck(hand) {
    const sortedHand = sortHand(hand);
    const deckElement = document.getElementById('deck');
    const targetContainer = document.getElementById('player-cards-before');
    
    if (!deckElement || !targetContainer) {
        // 要素が見つからない場合は通常の描画
        renderPlayerCardsInBeforeContainer();
        const playerCardsContainer = document.getElementById('player-cards');
        if (playerCardsContainer) {
            playerCardsContainer.innerHTML = '';
        }
        enableExchangeButtons();
        showStatus('カードが配られました。交換するカードを選んでください。', 'info');
        return;
    }
    
    // コンテナをクリア
    targetContainer.innerHTML = '';
    const playerCardsContainer = document.getElementById('player-cards');
    if (playerCardsContainer) {
        playerCardsContainer.innerHTML = '';
    }
    
    // 相手の手札もクリア
    const opponentContainer = document.getElementById('opponent-cards');
    if (opponentContainer) {
        opponentContainer.innerHTML = '';
    }
    
    // 各カードを順番に配る
    sortedHand.forEach((card, index) => {
        setTimeout(() => {
            // 山札とターゲットの位置を再取得（スクロール対応）
            const deckRect = deckElement.getBoundingClientRect();
            const targetRect = targetContainer.getBoundingClientRect();
            
            // ターゲット位置を計算（山札の中心からターゲットの各カード位置へ）
            const cardWidth = 100;
            const cardGap = 10;
            const totalWidth = sortedHand.length * cardWidth + (sortedHand.length - 1) * cardGap;
            const startX = targetRect.left + targetRect.width / 2 - totalWidth / 2;
            const cardX = startX + index * (cardWidth + cardGap) + cardWidth / 2;
            const cardY = targetRect.top + targetRect.height / 2;
            
            const targetX = cardX - (deckRect.left + deckRect.width / 2);
            const targetY = cardY - (deckRect.top + deckRect.height / 2);
            
            // 山札からカードを生成
            const flyingCard = createCardElement(card, index);
            flyingCard.style.position = 'fixed';
            flyingCard.style.left = `${deckRect.left + deckRect.width / 2 - 50}px`;
            flyingCard.style.top = `${deckRect.top + deckRect.height / 2 - 75}px`;
            flyingCard.style.zIndex = '10000';
            flyingCard.style.opacity = '0';
            flyingCard.style.transform = 'scale(0.8) rotateY(180deg)';
            flyingCard.style.pointerEvents = 'none';
            document.body.appendChild(flyingCard);
            
            // アニメーション: 山札からターゲットへ移動
            requestAnimationFrame(() => {
                flyingCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                flyingCard.style.opacity = '1';
                flyingCard.style.transform = `translate(${targetX}px, ${targetY}px) scale(1) rotateY(0deg)`;
            });
            
            // アニメーション完了後に通常のカード表示に切り替え
            setTimeout(() => {
                flyingCard.remove();
                
                // 通常のカードを表示
                const normalCard = createCardElement(card, index);
                normalCard.style.animationDelay = '0s';
                normalCard.style.opacity = '1';
                normalCard.style.transform = 'scale(1)';
                targetContainer.appendChild(normalCard);
                
                // 最後のカードが配られたら完了
                if (index === sortedHand.length - 1) {
                    setTimeout(() => {
                        enableExchangeButtons();
                        showStatus('カードが配られました。交換するカードを選んでください。', 'info');
                    }, 100);
                }
            }, 600);
        }, index * 150); // 各カードに150msの遅延
    });
    
    // 相手の手札にもカードバックを配るアニメーション
    if (opponentContainer) {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                // 山札とターゲットの位置を再取得
                const deckRect = deckElement.getBoundingClientRect();
                const targetRect = opponentContainer.getBoundingClientRect();
                
                // ターゲット位置を計算
                const cardWidth = 100;
                const cardGap = 10;
                const totalWidth = 5 * cardWidth + 4 * cardGap;
                const startX = targetRect.left + targetRect.width / 2 - totalWidth / 2;
                const cardX = startX + i * (cardWidth + cardGap) + cardWidth / 2;
                const cardY = targetRect.top + targetRect.height / 2;
                
                const targetX = cardX - (deckRect.left + deckRect.width / 2);
                const targetY = cardY - (deckRect.top + deckRect.height / 2);
                
                // 山札からカードバックを生成
                const flyingCardBack = createCardBackElement();
                flyingCardBack.style.position = 'fixed';
                flyingCardBack.style.left = `${deckRect.left + deckRect.width / 2 - 50}px`;
                flyingCardBack.style.top = `${deckRect.top + deckRect.height / 2 - 75}px`;
                flyingCardBack.style.zIndex = '10000';
                flyingCardBack.style.opacity = '0';
                flyingCardBack.style.transform = 'scale(0.8) rotateY(180deg)';
                flyingCardBack.style.pointerEvents = 'none';
                document.body.appendChild(flyingCardBack);
                
                // アニメーション: 山札からターゲットへ移動
                requestAnimationFrame(() => {
                    flyingCardBack.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    flyingCardBack.style.opacity = '1';
                    flyingCardBack.style.transform = `translate(${targetX}px, ${targetY}px) scale(1) rotateY(0deg)`;
                });
                
                // アニメーション完了後に通常のカードバック表示に切り替え
                setTimeout(() => {
                    flyingCardBack.remove();
                    
                    // 通常のカードバックを表示
                    const normalCardBack = createCardBackElement();
                    normalCardBack.style.animationDelay = '0s';
                    normalCardBack.style.opacity = '1';
                    normalCardBack.style.transform = 'scale(1)';
                    opponentContainer.appendChild(normalCardBack);
                }, 600);
            }, i * 150);
        }
    }
}

/**
 * 交換前のコンテナに選択可能なカードを描画（カード配布時用、アニメーション付き）
 */
function renderPlayerCardsInBeforeContainer() {
    const container = document.getElementById('player-cards-before');
    if (!container) {
        console.error('player-cards-before コンテナが見つかりません');
        return;
    }
    container.innerHTML = '';
    
    console.log('renderPlayerCardsInBeforeContainer: playerHand =', playerHand);
    
    // 現在のplayerHandを「交換前」の場所に選択可能なカードとして表示
    playerHand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        // 選択状態を復元
        const cardId = `${card.suit}-${card.value}`;
        if (selectedCardIds.includes(cardId)) {
            cardElement.classList.add('selected');
            // インデックスも更新
            const idIndex = selectedCardIds.indexOf(cardId);
            if (idIndex !== -1 && idIndex < selectedCardIndices.length) {
                selectedCardIndices[idIndex] = index;
            } else if (idIndex !== -1) {
                selectedCardIndices.push(index);
            }
        }
        // アニメーション: カードを順番に表示
        cardElement.style.animationDelay = `${index * 0.1}s`;
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
    // カードIDはスートと値のみで生成（同じカードは1枚しかないため）
    const cardId = `${card.suit}-${card.value}`;
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
    
    // クリックイベント（現在のインデックスを直接使用）
    cardDiv.addEventListener('click', () => {
        if (gamePhase === 'draw_phase') {
            toggleCardSelection(cardDiv, cardId, index);
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
function toggleCardSelection(cardElement, cardId, currentIndex) {
    const idIndex = selectedCardIds.indexOf(cardId);
    const indexIndex = selectedCardIndices.indexOf(currentIndex);
    
    if (idIndex === -1) {
        // 選択されていない場合、選択に追加
        if (selectedCardIds.length < 5) {
            selectedCardIds.push(cardId);
            selectedCardIndices.push(currentIndex);
            cardElement.classList.add('selected');
            console.log('カード選択:', cardId, 'インデックス:', currentIndex);
        }
    } else {
        // 選択されている場合、選択から削除
        selectedCardIds.splice(idIndex, 1);
        if (indexIndex !== -1) {
            selectedCardIndices.splice(indexIndex, 1);
        }
        cardElement.classList.remove('selected');
        console.log('カード選択解除:', cardId, 'インデックス:', currentIndex);
    }
    
    console.log('選択中のカードID:', selectedCardIds);
    console.log('選択中のカードインデックス:', selectedCardIndices);
}

/**
 * 選択されたカードのインデックスを取得
 * カードIDから確実にインデックスを取得する（インデックスの不一致を防ぐため）
 */
function getSelectedCardIndices() {
    const indices = [];
    
    console.log('getSelectedCardIndices: selectedCardIds =', selectedCardIds);
    console.log('getSelectedCardIndices: playerHand =', playerHand);
    
    // カードIDから直接インデックスを取得（最も確実な方法）
    selectedCardIds.forEach(cardId => {
        const parts = cardId.split('-');
        if (parts.length < 2) {
            console.error('不正なcardId:', cardId);
            return;
        }
        
        const suit = parts[0];
        const valueStr = parts[1];
        
        let value;
        if (valueStr && valueStr.match(/^\d+$/)) {
            value = parseInt(valueStr);
        } else {
            console.error('不正なvalue:', valueStr);
            return;
        }
        
        // 現在のplayerHandから該当するカードのインデックスを探す
        const foundIndex = playerHand.findIndex(card => 
            card.suit === suit && card.value === value
        );
        
        if (foundIndex !== -1) {
            indices.push(foundIndex);
            console.log(`カードID ${cardId} のインデックス: ${foundIndex}, カード: ${playerHand[foundIndex].label}${playerHand[foundIndex].suit}`);
        } else {
            console.error('カードが見つかりません:', cardId, 'playerHand:', playerHand.map(c => `${c.label}${c.suit}`));
        }
    });
    
    console.log('選択されたカードのインデックス:', indices);
    console.log('選択されたカード:', indices.map(idx => `${playerHand[idx].label}${playerHand[idx].suit}`));
    
    return indices;
}

/**
 * 交換ボタンを有効化
 */
function enableExchangeButtons() {
    document.getElementById('exchange-btn').disabled = false;
    document.getElementById('exchange-all-btn').disabled = false;
    document.getElementById('skip-exchange-btn').disabled = false;
}

/**
 * 交換ボタンを無効化
 */
function disableExchangeButtons() {
    document.getElementById('exchange-btn').disabled = true;
    document.getElementById('exchange-all-btn').disabled = true;
    document.getElementById('skip-exchange-btn').disabled = true;
}

/**
 * 結果画面を表示
 */
function showResultScreen(data) {
    showScreen('result-screen');
    
    // ゲーム結果タイトルは固定
    const resultTitle = document.getElementById('result-title');
    resultTitle.textContent = 'ゲーム結果';
    resultTitle.className = '';
    
    // 勝敗を「あなたの手札」の右側に表示
    const yourResultStatus = document.getElementById('your-result-status');
    let statusText = '';
    let statusClass = '';
    
    if (data.winner === 'you') {
        statusText = '🎉 あなたの勝ち！';
        statusClass = 'result-status win';
    } else if (data.winner === 'opponent') {
        statusText = '😢 あなたの負け';
        statusClass = 'result-status lose';
    } else {
        statusText = '🤝 引き分け';
        statusClass = 'result-status draw';
    }
    
    // 勝敗メッセージを表示
    yourResultStatus.className = statusClass;
    yourResultStatus.textContent = statusText;
    
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
    
    // 統計情報を更新（サーバー側で自動的に更新されるため、クライアント側では更新しない）
    // プレイヤー名を更新
    const playerNameForStats = data.player_name || data.your_result?.player_name || currentPlayerName || localStorage.getItem('last_player_name') || '';
    console.log('ゲーム結果受信:', {
        'data.player_name': data.player_name,
        'data.your_result.player_name': data.your_result?.player_name,
        'currentPlayerName': currentPlayerName,
        'localStorage.last_player_name': localStorage.getItem('last_player_name'),
        'playerNameForStats': playerNameForStats,
        'winner': data.winner
    });
    
    if (playerNameForStats) {
        // サーバーから返されたプレイヤー名でcurrentPlayerNameを更新
        if (data.player_name) {
            currentPlayerName = data.player_name;
            localStorage.setItem('last_player_name', data.player_name);
            console.log('currentPlayerNameを更新:', currentPlayerName);
        } else if (data.your_result?.player_name) {
            currentPlayerName = data.your_result.player_name;
            localStorage.setItem('last_player_name', data.your_result.player_name);
            console.log('currentPlayerNameを更新（your_resultから）:', currentPlayerName);
        }
        
        // サーバー側で戦績が自動更新されるため、クライアント側では更新しない
        // 戦績をサーバーから取得して表示を更新
        loadPlayerStatsFromServer(playerNameForStats);
    } else {
        console.error('プレイヤー名が取得できませんでした', { 
            data, 
            currentPlayerName,
            'data.player_name': data.player_name,
            'data.your_result': data.your_result,
            'localStorage.last_player_name': localStorage.getItem('last_player_name')
        });
    }
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
 * 役と確率の一覧表モーダルを表示
 */
function showHandsModal() {
    const modal = document.getElementById('hands-modal');
    modal.classList.add('show');
}

/**
 * 役と確率の一覧表モーダルを閉じる
 */
function closeHandsModal() {
    const modal = document.getElementById('hands-modal');
    modal.classList.remove('show');
}

/**
 * 交換回数選択モーダルを表示
 */
function showExchangeCountModal() {
    const modal = document.getElementById('exchange-count-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * 交換回数選択モーダルを閉じる
 */
function closeExchangeCountModal() {
    const modal = document.getElementById('exchange-count-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * 交換回数選択（1, 2, 3回）
 */
function selectExchangeCount(count) {
    if (currentRoomId && count >= 1 && count <= 3) {
        socket.emit('set_exchange_count', {
            room_id: currentRoomId,
            exchange_count: count
        });
        closeExchangeCountModal();
        showStatus(`交換回数を${count}回に設定しました`, 'success');
    }
}

/**
 * 交換ラウンド表示を更新
 */
function updateExchangeRoundDisplay() {
    const display = document.getElementById('exchange-round-display');
    if (display && maxExchanges !== null) {
        display.textContent = `第${currentExchangeRound}回目の交換（全${maxExchanges}回）`;
        display.style.display = 'block';
    } else if (display) {
        display.style.display = 'none';
    }
}

/**
 * プレイヤー名をローカルストレージに保存
 */
function savePlayerName(playerName) {
    try {
        const savedNames = getSavedPlayerNames();
        // 既に存在する場合は削除（重複を避けるため）
        const filteredNames = savedNames.filter(name => name !== playerName);
        // 新しい名前を先頭に追加（最新のものから表示）
        filteredNames.unshift(playerName);
        // 最大10件まで保存
        const namesToSave = filteredNames.slice(0, 10);
        localStorage.setItem('poker_player_names', JSON.stringify(namesToSave));
        // datalistを更新
        updatePlayerNamesDatalist();
    } catch (e) {
        console.error('Failed to save player name:', e);
    }
}

/**
 * ローカルストレージからプレイヤー名を取得
 */
function getSavedPlayerNames() {
    try {
        const saved = localStorage.getItem('poker_player_names');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to get saved player names:', e);
    }
    return [];
}

/**
 * プレイヤー名のdatalistを更新
 */
function updatePlayerNamesDatalist() {
    const datalist = document.getElementById('player-names');
    const savedNames = getSavedPlayerNames();
    
    // datalistをクリア
    datalist.innerHTML = '';
    
    // 保存された名前をdatalistに追加
    savedNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

/**
 * ページ読み込み時にプレイヤー名を読み込む
 */
function loadPlayerNames() {
    updatePlayerNamesDatalist();
}

/**
 * サーバーからプレイヤーの統計情報を取得
 */
function loadPlayerStatsFromServer(playerName) {
    if (!playerName) {
        console.warn('プレイヤー名が指定されていません');
        return;
    }
    
    console.log('サーバーから戦績を取得:', playerName);
    try {
        socket.emit('get_stats', { player_name: playerName });
    } catch (e) {
        console.error('戦績取得リクエスト送信エラー:', e);
        showStatus('戦績の取得に失敗しました', 'error');
    }
}

/**
 * サーバーから全プレイヤーの統計情報を取得
 */
function loadAllStatsFromServer() {
    console.log('サーバーから全戦績を取得');
    socket.emit('get_all_stats');
}

/**
 * プレイヤーの統計情報を更新（サーバー側で自動更新されるため、この関数は使用しない）
 * @deprecated サーバー側で自動更新されるため、この関数は使用しません
 */
function updatePlayerStats(playerName, gameResult) {
    console.warn('updatePlayerStatsは非推奨です。サーバー側で自動更新されます。');
}

// サーバーから取得した戦績をキャッシュ
let cachedStats = {};
let cachedAllStats = {};

/**
 * プレイヤーの統計情報を取得（キャッシュから）
 */
function getPlayerStats(playerName) {
    if (!playerName) {
        return {
            totalGames: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            hands: {}
        };
    }
    
    // キャッシュから取得
    const stats = cachedStats[playerName] || cachedAllStats[playerName] || {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        hands: {}
    };
    
    console.log('統計情報を取得（キャッシュ）:', { playerName, stats: JSON.parse(JSON.stringify(stats)) });
    return stats;
}

/**
 * 全プレイヤーの統計情報を取得（キャッシュから）
 */
function getAllPlayerStats() {
    return cachedAllStats;
}

/**
 * 統計情報モーダルを表示
 */
function showStatsModal() {
    const modal = document.getElementById('stats-modal');
    const statsDisplay = document.getElementById('stats-display');
    const noStatsMessage = document.getElementById('no-stats-message');
    
    if (currentPlayerName) {
        // サーバーから最新の戦績を取得
        loadPlayerStatsFromServer(currentPlayerName);
        
        // キャッシュから統計情報を取得（サーバーからのレスポンスで更新される）
        const stats = getPlayerStats(currentPlayerName);
        
        if (stats.totalGames > 0) {
            // 統計情報を表示
            noStatsMessage.style.display = 'none';
            statsDisplay.style.display = 'block';
            
            // 統計情報を更新
            document.getElementById('stats-player-name').textContent = currentPlayerName;
            document.getElementById('stats-total-games').textContent = stats.totalGames;
            document.getElementById('stats-wins').textContent = stats.wins || 0;
            document.getElementById('stats-losses').textContent = stats.losses || 0;
            
            // 勝率を計算
            const winRate = stats.totalGames > 0 ? ((stats.wins || 0) / stats.totalGames * 100).toFixed(1) : 0;
            document.getElementById('stats-win-rate').textContent = `${winRate}%`;
            
            // 役の統計を表示
            const handsList = document.getElementById('stats-hands-list');
            handsList.innerHTML = '';
            
            // 役の一覧（強さ順）
            const handOrder = [
                'ロイヤルフラッシュ',
                'ストレートフラッシュ',
                'フォーカード',
                'フルハウス',
                'フラッシュ',
                'ストレート',
                'スリーカード',
                'ツーペア',
                'ワンペア',
                'ハイカード'
            ];
            
            handOrder.forEach(handName => {
                const count = stats.hands[handName] || 0;
                if (count > 0) {
                    const percentage = (count / stats.totalGames * 100).toFixed(1);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${handName}</strong></td>
                        <td>${count}回</td>
                        <td>${percentage}%</td>
                    `;
                    handsList.appendChild(row);
                }
            });
        } else {
            // 統計データがない場合
            noStatsMessage.style.display = 'block';
            statsDisplay.style.display = 'none';
        }
    } else {
        // プレイヤー名が設定されていない場合
        noStatsMessage.style.display = 'block';
        statsDisplay.style.display = 'none';
    }
    
    modal.classList.add('show');
}

/**
 * 全プレイヤーの役の記録を表示
 */
function displayAllPlayersHandsRecords() {
    const allPlayersHandsList = document.getElementById('all-players-hands-list');
    if (!allPlayersHandsList) {
        return;
    }
    
    // サーバーから全プレイヤーの戦績を取得
    loadAllStatsFromServer();
    
    // キャッシュから全プレイヤーの戦績を取得
    const allStats = getAllPlayerStats();
    
    // 全てのプレイヤー名を取得
    const playerNames = Object.keys(allStats);
    
    if (playerNames.length === 0) {
        allPlayersHandsList.innerHTML = '<p class="no-stats-message">まだ他のプレイヤーの統計データがありません。</p>';
        return;
    }
    
    allPlayersHandsList.innerHTML = '';
    
    // 役の一覧（強さ順）
    const handOrder = [
        'ロイヤルフラッシュ',
        'ストレートフラッシュ',
        'フォーカード',
        'フルハウス',
        'フラッシュ',
        'ストレート',
        'スリーカード',
        'ツーペア',
        'ワンペア',
        'ハイカード'
    ];
    
    // 各プレイヤーごとに役の記録を表示
    playerNames.forEach(playerName => {
        const playerStats = allStats[playerName];
        if (!playerStats || !playerStats.hands || Object.keys(playerStats.hands).length === 0) {
            return;
        }
        
        const playerSection = document.createElement('div');
        playerSection.className = 'player-hands-section';
        
        const playerHeader = document.createElement('div');
        playerHeader.className = 'player-hands-header';
        playerHeader.innerHTML = `<h4>${playerName}</h4>`;
        playerSection.appendChild(playerHeader);
        
        const handsTable = document.createElement('table');
        handsTable.className = 'stats-table player-hands-table';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>役</th>
                <th>回数</th>
                <th>割合</th>
            </tr>
        `;
        handsTable.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        handOrder.forEach(handName => {
            const count = playerStats.hands[handName] || 0;
            if (count > 0) {
                const percentage = (count / (playerStats.totalGames || 1) * 100).toFixed(1);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${handName}</strong></td>
                    <td>${count}回</td>
                    <td>${percentage}%</td>
                `;
                tbody.appendChild(row);
            }
        });
        
        // 役の記録がない場合はスキップ
        if (tbody.children.length === 0) {
            return;
        }
        
        handsTable.appendChild(tbody);
        playerSection.appendChild(handsTable);
        allPlayersHandsList.appendChild(playerSection);
    });
    
    // 役の記録がないプレイヤーがいる場合
    if (allPlayersHandsList.children.length === 0) {
        allPlayersHandsList.innerHTML = '<p class="no-stats-message">まだ他のプレイヤーの役の記録がありません。</p>';
    }
}

/**
 * 全プレイヤーの役の記録モーダルを表示
 */
function showAllPlayersHandsModal() {
    const modal = document.getElementById('all-players-hands-modal');
    if (modal) {
        displayAllPlayersHandsRecords();
        modal.classList.add('show');
    }
}

/**
 * 全プレイヤーの役の記録モーダルを閉じる
 */
function closeAllPlayersHandsModal() {
    const modal = document.getElementById('all-players-hands-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * 統計情報モーダルを閉じる
 */
function closeStatsModal() {
    const modal = document.getElementById('stats-modal');
    modal.classList.remove('show');
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
 * 残りのカード枚数を更新
 */
function updateRemainingCards(count) {
    const remainingCardsElement = document.getElementById('remaining-cards');
    const remainingCardsCountElement = document.getElementById('remaining-cards-count');
    
    if (remainingCardsElement && remainingCardsCountElement) {
        remainingCardsCountElement.textContent = count;
        remainingCardsElement.style.display = 'block';
    }
}

/**
 * 残りのカードリストを表示（グリッド形式：同じ数字は縦に並べる）
 */
function renderRemainingCards(cardsList) {
    const remainingCardsArea = document.getElementById('remaining-cards-area');
    const remainingCardsList = document.getElementById('remaining-cards-list');
    
    if (!remainingCardsArea || !remainingCardsList) {
        return;
    }
    
    // 既存のカードをクリア
    remainingCardsList.innerHTML = '';
    
    if (!cardsList) {
        remainingCardsArea.style.display = 'none';
        return;
    }
    
    // 残りのカードをマップに変換（検索を高速化）
    const remainingCardsMap = new Map();
    cardsList.forEach(card => {
        const key = `${card.suit}-${card.value}`;
        remainingCardsMap.set(key, card);
    });
    
    // 全52枚のカードを生成
    const suits = ['♠', '♥', '♦', '♣'];
    const values = [
        {label: 'A', value: 14},
        {label: '2', value: 2},
        {label: '3', value: 3},
        {label: '4', value: 4},
        {label: '5', value: 5},
        {label: '6', value: 6},
        {label: '7', value: 7},
        {label: '8', value: 8},
        {label: '9', value: 9},
        {label: '10', value: 10},
        {label: 'J', value: 11},
        {label: 'Q', value: 12},
        {label: 'K', value: 13}
    ];
    
    // グリッドを作成（13列 × 4行）
    // 各列は数字ごと、各行はスートごと
    values.forEach((valueInfo, colIndex) => {
        const column = document.createElement('div');
        column.className = 'remaining-cards-column';
        
        // 列ヘッダー（数字）
        const columnHeader = document.createElement('div');
        columnHeader.className = 'remaining-cards-column-header';
        columnHeader.textContent = valueInfo.label;
        column.appendChild(columnHeader);
        
        // 各スートのカード
        suits.forEach((suit) => {
            const cardKey = `${suit}-${valueInfo.value}`;
            const cardCell = document.createElement('div');
            cardCell.className = 'remaining-cards-cell';
            
            if (remainingCardsMap.has(cardKey)) {
                // 残りのカードに含まれている場合はカードを表示
                const card = remainingCardsMap.get(cardKey);
                const cardElement = createCardElementForRemaining(card);
                cardCell.appendChild(cardElement);
            } else {
                // 自分の手札にある場合は空白
                cardCell.className = 'remaining-cards-cell empty';
            }
            
            column.appendChild(cardCell);
        });
        
        remainingCardsList.appendChild(column);
    });
    
    remainingCardsArea.style.display = 'block';
}

/**
 * 残りのカード表示用のカード要素を作成
 */
function createCardElementForRemaining(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    
    const suitColor = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
    
    cardDiv.innerHTML = `
        <div class="card-label ${suitColor}">${card.label}</div>
        <div class="card-suit ${suitColor}">${card.suit}</div>
    `;
    
    return cardDiv;
}

/**
 * ゲームをリセット
 */
function resetGame() {
    playerHand = [];
    playerHandBeforeExchange = [];
    selectedCards = [];
    selectedCardIds = [];
    selectedCardIndices = [];
    gamePhase = 'lobby';
    maxExchanges = null;
    currentExchangeRound = 0;
    
    const playerCardsContainer = document.getElementById('player-cards');
    if (playerCardsContainer) {
        playerCardsContainer.innerHTML = '';
    }
    const playerCardsBeforeContainer = document.getElementById('player-cards-before');
    if (playerCardsBeforeContainer) {
        playerCardsBeforeContainer.innerHTML = '';
    }
    // 残りのカード表示をリセット
    const remainingCardsElement = document.getElementById('remaining-cards');
    if (remainingCardsElement) {
        remainingCardsElement.style.display = 'none';
    }
    const remainingCardsArea = document.getElementById('remaining-cards-area');
    if (remainingCardsArea) {
        remainingCardsArea.style.display = 'none';
    }
}

