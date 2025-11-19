# WANT機能実装ガイド: 手札の自動並び替え

**優先度**: 高  
**所要時間**: 1-2時間  
**難易度**: 中

---

## 📋 機能概要

手札を自動的に並び替えて、以下のように表示する機能：

1. **数字順に並び替え**: 小さい順または大きい順
2. **役が強く見えるように並び替え**: ペアをまとめて左側に配置

---

## 🎯 実装方針

### 並び替えのロジック

1. **ペアがある場合**:
   - ペアのカードを左側に配置
   - 残りのカードを数字順に並べる

2. **ペアがない場合**:
   - 数字順（昇順または降順）に並べる

3. **同じ数字の場合**:
   - スートの順序（♠ > ♥ > ♦ > ♣ または任意）で並べる

---

## 🛠️ 必要な作業

### ステップ1: 並び替え関数の作成

**ファイル**: `frontend/js/game.js`

**追加する関数**:

```javascript
/**
 * 手札を自動的に並び替える
 * @param {Array} cards - カードの配列
 * @returns {Array} - 並び替えられたカードの配列
 */
function sortHand(cards) {
    // カードをコピー（元の配列を変更しない）
    const sortedCards = [...cards];
    
    // 1. 数字の値でグループ化
    const valueGroups = {};
    sortedCards.forEach(card => {
        if (!valueGroups[card.value]) {
            valueGroups[card.value] = [];
        }
        valueGroups[card.value].push(card);
    });
    
    // 2. ペアやトリプルなどの組み合わせを検出
    const pairs = [];
    const singles = [];
    
    Object.keys(valueGroups).forEach(value => {
        const group = valueGroups[value];
        if (group.length >= 2) {
            // ペア以上がある場合
            pairs.push(...group);
        } else {
            // 単独カード
            singles.push(...group);
        }
    });
    
    // 3. ペアを数字の大きい順にソート
    pairs.sort((a, b) => {
        if (a.value !== b.value) {
            return b.value - a.value; // 数字の大きい順
        }
        // 同じ数字の場合はスートでソート
        const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
        return suitOrder[a.suit] - suitOrder[b.suit];
    });
    
    // 4. 単独カードを数字の大きい順にソート
    singles.sort((a, b) => {
        if (a.value !== b.value) {
            return b.value - a.value; // 数字の大きい順
        }
        // 同じ数字の場合はスートでソート
        const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
        return suitOrder[a.suit] - suitOrder[b.suit];
    });
    
    // 5. ペアを左側に、単独カードを右側に配置
    return [...pairs, ...singles];
}
```

---

### ステップ2: カード配布時の並び替え

**ファイル**: `frontend/js/game.js`

**修正箇所**: `cards_dealt` イベントハンドラー

**修正前**:
```javascript
socket.on('cards_dealt', (data) => {
    playerHand = data.hand;
    gamePhase = 'draw_phase';
    showScreen('game-screen');
    renderPlayerCards();
    enableExchangeButtons();
    showStatus('カードが配られました。交換するカードを選んでください。', 'info');
});
```

**修正後**:
```javascript
socket.on('cards_dealt', (data) => {
    playerHand = sortHand(data.hand); // 並び替えを追加
    gamePhase = 'draw_phase';
    showScreen('game-screen');
    renderPlayerCards();
    enableExchangeButtons();
    showStatus('カードが配られました。交換するカードを選んでください。', 'info');
});
```

---

### ステップ3: カード交換時の並び替え

**ファイル**: `frontend/js/game.js`

**修正箇所**: `cards_exchanged` イベントハンドラー

**修正前**:
```javascript
socket.on('cards_exchanged', (data) => {
    playerHand = data.hand;
    renderPlayerCards();
    disableExchangeButtons();
    showStatus('カード交換完了。相手の交換を待っています...', 'info');
});
```

**修正後**:
```javascript
socket.on('cards_exchanged', (data) => {
    playerHand = sortHand(data.hand); // 並び替えを追加
    renderPlayerCards();
    disableExchangeButtons();
    showStatus('カード交換完了。相手の交換を待っています...', 'info');
});
```

---

### ステップ4: カード選択のインデックス修正

**問題**: 並び替え後、カードのインデックスが変わるため、選択したカードのインデックスを正しく追跡する必要があります。

**解決方法**: カードに一意のIDを付与するか、カードオブジェクト自体で選択状態を管理

**修正案1: カードにIDを追加（推奨）**

```javascript
/**
 * カード要素を作成
 */
function createCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.index = index;
    cardDiv.dataset.cardId = `${card.suit}-${card.value}`; // 一意のIDを追加
    
    // ... 既存のコード ...
    
    // クリックイベント
    cardDiv.addEventListener('click', () => {
        if (gamePhase === 'draw_phase') {
            toggleCardSelection(cardDiv, card); // indexではなくcardオブジェクトを渡す
        }
    });
    
    return cardDiv;
}

/**
 * カード選択のトグル（修正版）
 */
function toggleCardSelection(cardElement, card) {
    const cardId = cardElement.dataset.cardId;
    
    // 選択状態をカードオブジェクトで管理
    if (!card.selected) {
        card.selected = true;
        cardElement.classList.add('selected');
    } else {
        card.selected = false;
        cardElement.classList.remove('selected');
    }
}

/**
 * 選択されたカードのインデックスを取得
 */
function getSelectedCardIndices() {
    return playerHand
        .map((card, index) => card.selected ? index : null)
        .filter(index => index !== null);
}
```

**修正案2: 選択状態を別の配列で管理（シンプル）**

```javascript
// グローバル変数に追加
let selectedCardIds = []; // 選択されたカードのIDを保存

/**
 * カード要素を作成（修正版）
 */
function createCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.index = index;
    const cardId = `${card.suit}-${card.value}-${index}`; // 一意のID
    cardDiv.dataset.cardId = cardId;
    
    // 既に選択されている場合はselectedクラスを追加
    if (selectedCardIds.includes(cardId)) {
        cardDiv.classList.add('selected');
    }
    
    // ... 既存のコード ...
    
    // クリックイベント
    cardDiv.addEventListener('click', () => {
        if (gamePhase === 'draw_phase') {
            toggleCardSelection(cardDiv, cardId);
        }
    });
    
    return cardDiv;
}

/**
 * カード選択のトグル（修正版）
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
        const index = playerHand.findIndex((card, idx) => {
            const id = `${card.suit}-${card.value}-${idx}`;
            return id === cardId;
        });
        return index;
    }).filter(index => index !== -1);
}

// カード交換ボタンのイベントハンドラーを修正
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
    
    selectedCardIds = []; // 選択をクリア
});
```

---

## 📝 実装手順

### 1. 並び替え関数の追加

`frontend/js/game.js` に `sortHand()` 関数を追加

### 2. カード配布時の並び替え

`cards_dealt` イベントハンドラーで `sortHand()` を呼び出す

### 3. カード交換時の並び替え

`cards_exchanged` イベントハンドラーで `sortHand()` を呼び出す

### 4. カード選択の修正

選択状態の管理方法を修正（上記の修正案1または2を採用）

### 5. テスト

- カード配布時に自動的に並び替えられるか確認
- カード交換後に自動的に並び替えられるか確認
- カード選択が正しく動作するか確認

---

## 🎨 UI改善（オプション）

### 並び替えアニメーション

並び替え時にスムーズなアニメーションを追加：

```javascript
function renderPlayerCards() {
    const container = document.getElementById('player-cards');
    
    // 既存のカードをフェードアウト
    container.querySelectorAll('.card').forEach(card => {
        card.style.transition = 'opacity 0.3s';
        card.style.opacity = '0';
    });
    
    // 少し待ってから新しいカードを表示
    setTimeout(() => {
        container.innerHTML = '';
        
        playerHand.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            cardElement.style.opacity = '0';
            container.appendChild(cardElement);
            
            // フェードインアニメーション
            setTimeout(() => {
                cardElement.style.transition = 'opacity 0.3s';
                cardElement.style.opacity = '1';
            }, index * 50); // 順番に表示
        });
    }, 300);
}
```

---

## 🔧 実装の詳細

### 並び替えロジックの詳細

#### 1. ペアの検出

```javascript
// 同じ数字のカードをグループ化
const valueGroups = {};
cards.forEach(card => {
    if (!valueGroups[card.value]) {
        valueGroups[card.value] = [];
    }
    valueGroups[card.value].push(card);
});

// 2枚以上あるグループをペアとして扱う
const pairs = [];
Object.keys(valueGroups).forEach(value => {
    if (valueGroups[value].length >= 2) {
        pairs.push(...valueGroups[value]);
    }
});
```

#### 2. ソート順序

- **ペア**: 数字の大きい順 → スート順
- **単独カード**: 数字の大きい順 → スート順

#### 3. 最終的な配置

```
[ペア1, ペア2, ..., 単独カード1, 単独カード2, ...]
```

---

## ⚠️ 注意事項

### 1. カード選択のインデックス問題

並び替え後、カードのインデックスが変わるため、選択状態の管理方法を変更する必要があります。

**推奨**: カードに一意のIDを付与して管理

### 2. 並び替えのタイミング

- カード配布時: 自動的に並び替え
- カード交換時: 自動的に並び替え
- 手動での並び替え: オプション（ボタン追加）

### 3. パフォーマンス

5枚のカードなので、パフォーマンスへの影響はほとんどありません。

---

## 🧪 テスト項目

### 機能テスト

- [ ] カード配布時に自動的に並び替えられる
- [ ] カード交換後に自動的に並び替えられる
- [ ] ペアがある場合、ペアが左側に配置される
- [ ] ペアがない場合、数字順に並べられる
- [ ] カード選択が正しく動作する
- [ ] 並び替え後も選択状態が保持される

### UIテスト

- [ ] 並び替えがスムーズに表示される
- [ ] アニメーションが自然（オプション）
- [ ] モバイルでも正しく表示される

---

## 📊 実装の複雑度

| 項目 | 難易度 | 所要時間 |
|------|--------|---------|
| **並び替え関数の作成** | 中 | 30分 |
| **イベントハンドラーの修正** | 低 | 15分 |
| **カード選択の修正** | 中 | 30分 |
| **テスト・デバッグ** | 低 | 15分 |
| **合計** | - | **約1.5時間** |

---

## 🎯 実装後の効果

### ユーザー体験の向上

- ✅ 手札が整理されて見やすくなる
- ✅ ペアが一目で分かる
- ✅ 役の強さが分かりやすくなる

### ゲームプレイの改善

- ✅ カード選択がしやすくなる
- ✅ 戦略を立てやすくなる

---

## 📝 コード例（完全版）

### sortHand関数の完全版

```javascript
/**
 * 手札を自動的に並び替える
 * ペアを左側に、残りを数字順に配置
 */
function sortHand(cards) {
    if (!cards || cards.length === 0) {
        return [];
    }
    
    // カードをコピー
    const sortedCards = [...cards];
    
    // 1. 数字の値でグループ化
    const valueGroups = {};
    sortedCards.forEach(card => {
        if (!valueGroups[card.value]) {
            valueGroups[card.value] = [];
        }
        valueGroups[card.value].push(card);
    });
    
    // 2. ペアと単独カードを分離
    const pairs = [];
    const singles = [];
    
    Object.keys(valueGroups).forEach(value => {
        const group = valueGroups[value];
        if (group.length >= 2) {
            // ペア以上がある場合、数字の大きい順にソート
            group.sort((a, b) => {
                const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
                return suitOrder[a.suit] - suitOrder[b.suit];
            });
            pairs.push(...group);
        } else {
            singles.push(...group);
        }
    });
    
    // 3. ペアを数字の大きい順にソート
    pairs.sort((a, b) => {
        // まず、ペアの数字で比較
        const aPairValue = valueGroups[a.value].length;
        const bPairValue = valueGroups[b.value].length;
        if (aPairValue !== bPairValue) {
            return bPairValue - aPairValue; // トリプル > ペア
        }
        // 同じ種類のペアの場合、数字で比較
        if (a.value !== b.value) {
            return b.value - a.value; // 数字の大きい順
        }
        // 同じ数字の場合はスートでソート
        const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
        return suitOrder[a.suit] - suitOrder[b.suit];
    });
    
    // 4. 単独カードを数字の大きい順にソート
    singles.sort((a, b) => {
        if (a.value !== b.value) {
            return b.value - a.value; // 数字の大きい順
        }
        // 同じ数字の場合はスートでソート
        const suitOrder = {'♠': 0, '♥': 1, '♦': 2, '♣': 3};
        return suitOrder[a.suit] - suitOrder[b.suit];
    });
    
    // 5. ペアを左側に、単独カードを右側に配置
    const result = [...pairs, ...singles];
    
    // 6. 重複を除去（念のため）
    const uniqueResult = [];
    const seen = new Set();
    result.forEach(card => {
        const key = `${card.suit}-${card.value}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResult.push(card);
        } else {
            // 重複がある場合（同じカードが2枚以上）、追加
            uniqueResult.push(card);
        }
    });
    
    return uniqueResult;
}
```

---

## 🚀 実装の開始

### 推奨される実装順序

1. **並び替え関数の作成**（30分）
   - `sortHand()` 関数を追加
   - 簡単なテストで動作確認

2. **イベントハンドラーの修正**（15分）
   - `cards_dealt` と `cards_exchanged` で並び替えを呼び出す

3. **カード選択の修正**（30分）
   - 選択状態の管理方法を変更
   - テストで動作確認

4. **統合テスト**（15分）
   - 実際にゲームをプレイして確認
   - エラーがないか確認

---

## 📚 参考資料

- [JavaScript Array.sort()](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
- [ポーカーの役一覧](https://ja.wikipedia.org/wiki/%E3%83%9D%E3%83%BC%E3%82%AB%E3%83%BC%E3%81%AE%E5%BD%B9%E4%B8%80%E8%A6%A7)

---

**最終更新日**: 2024年11月18日  
**作成者**: 開発チーム  
**バージョン**: 1.0.0

