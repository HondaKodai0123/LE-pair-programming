"""
ポーカーのゲームロジック（役判定・勝敗判定）
"""
from collections import Counter


class PokerHand:
    """ポーカーの役を判定するクラス"""
    
    # 役のランク（強い順）
    HAND_RANKS = {
        'Royal Flush': 10,
        'Straight Flush': 9,
        'Four of a Kind': 8,
        'Full House': 7,
        'Flush': 6,
        'Straight': 5,
        'Three of a Kind': 4,
        'Two Pair': 3,
        'One Pair': 2,
        'High Card': 1
    }
    
    @staticmethod
    def evaluate_hand(cards):
        """
        5枚のカードから役を判定
        
        Args:
            cards (list): カードのリスト [{'suit': '♠', 'label': 'A', 'value': 14}, ...]
        
        Returns:
            dict: {
                'hand_name': '役名',
                'hand_rank': 役のランク値,
                'high_card': 最高カード値（タイブレーク用）,
                'kicker': キッカー（タイブレーク用の追加情報）
            }
        """
        if len(cards) != 5:
            raise ValueError("手札は5枚である必要があります")
        
        # カードを値でソート
        sorted_cards = sorted(cards, key=lambda x: x['value'], reverse=True)
        values = [card['value'] for card in sorted_cards]
        suits = [card['suit'] for card in sorted_cards]
        
        # フラッシュ判定
        is_flush = len(set(suits)) == 1
        
        # ストレート判定
        is_straight = PokerHand._is_straight(values)
        
        # ストレートフラッシュ / ロイヤルフラッシュ
        if is_flush and is_straight:
            if values[0] == 14:  # A, K, Q, J, 10
                return {
                    'hand_name': 'Royal Flush',
                    'hand_rank': PokerHand.HAND_RANKS['Royal Flush'],
                    'high_card': 14,
                    'kicker': values
                }
            else:
                return {
                    'hand_name': 'Straight Flush',
                    'hand_rank': PokerHand.HAND_RANKS['Straight Flush'],
                    'high_card': values[0],
                    'kicker': values
                }
        
        # 同じ値のカードをカウント
        value_counts = Counter(values)
        counts = sorted(value_counts.values(), reverse=True)
        unique_values = sorted(value_counts.keys(), key=lambda x: (value_counts[x], x), reverse=True)
        
        # フォーカード
        if counts == [4, 1]:
            return {
                'hand_name': 'Four of a Kind',
                'hand_rank': PokerHand.HAND_RANKS['Four of a Kind'],
                'high_card': unique_values[0],
                'kicker': unique_values
            }
        
        # フルハウス
        if counts == [3, 2]:
            return {
                'hand_name': 'Full House',
                'hand_rank': PokerHand.HAND_RANKS['Full House'],
                'high_card': unique_values[0],
                'kicker': unique_values
            }
        
        # フラッシュ
        if is_flush:
            return {
                'hand_name': 'Flush',
                'hand_rank': PokerHand.HAND_RANKS['Flush'],
                'high_card': values[0],
                'kicker': values
            }
        
        # ストレート
        if is_straight:
            return {
                'hand_name': 'Straight',
                'hand_rank': PokerHand.HAND_RANKS['Straight'],
                'high_card': values[0],
                'kicker': values
            }
        
        # スリーカード
        if counts == [3, 1, 1]:
            return {
                'hand_name': 'Three of a Kind',
                'hand_rank': PokerHand.HAND_RANKS['Three of a Kind'],
                'high_card': unique_values[0],
                'kicker': unique_values
            }
        
        # ツーペア
        if counts == [2, 2, 1]:
            return {
                'hand_name': 'Two Pair',
                'hand_rank': PokerHand.HAND_RANKS['Two Pair'],
                'high_card': unique_values[0],
                'kicker': unique_values
            }
        
        # ワンペア
        if counts == [2, 1, 1, 1]:
            return {
                'hand_name': 'One Pair',
                'hand_rank': PokerHand.HAND_RANKS['One Pair'],
                'high_card': unique_values[0],
                'kicker': unique_values
            }
        
        # ハイカード
        return {
            'hand_name': 'High Card',
            'hand_rank': PokerHand.HAND_RANKS['High Card'],
            'high_card': values[0],
            'kicker': values
        }
    
    @staticmethod
    def _is_straight(values):
        """
        ストレートかどうかを判定
        
        Args:
            values (list): カードの値のリスト（降順ソート済み）
        
        Returns:
            bool: ストレートならTrue
        """
        # 通常のストレート
        if values == list(range(values[0], values[0] - 5, -1)):
            return True
        
        # A-2-3-4-5 のストレート（Aを1として扱う）
        if values == [14, 5, 4, 3, 2]:
            return True
        
        return False
    
    @staticmethod
    def compare_hands(hand1_result, hand2_result):
        """
        2つの手札を比較して勝者を決定
        
        Args:
            hand1_result (dict): プレイヤー1の役判定結果
            hand2_result (dict): プレイヤー2の役判定結果
        
        Returns:
            int: 1 (プレイヤー1の勝ち), 2 (プレイヤー2の勝ち), 0 (引き分け)
        """
        # 役のランクで比較
        if hand1_result['hand_rank'] > hand2_result['hand_rank']:
            return 1
        elif hand1_result['hand_rank'] < hand2_result['hand_rank']:
            return 2
        
        # 役が同じ場合、キッカーで比較
        kicker1 = hand1_result['kicker']
        kicker2 = hand2_result['kicker']
        
        for k1, k2 in zip(kicker1, kicker2):
            if k1 > k2:
                return 1
            elif k1 < k2:
                return 2
        
        # 完全に引き分け
        return 0

