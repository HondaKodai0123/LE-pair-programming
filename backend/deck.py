"""
トランプデッキの生成とシャッフルを管理するモジュール
"""
import random


class Deck:
    """トランプデッキクラス"""
    
    SUITS = ['♠', '♥', '♦', '♣']
    VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    VALUE_MAP = {
        'A': 14,  # Aは最強として14
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13
    }
    
    def __init__(self):
        """デッキを初期化"""
        self.cards = []
        self.reset()
    
    def reset(self):
        """52枚のカードを生成してシャッフル"""
        self.cards = []
        for suit in self.SUITS:
            for i, label in enumerate(self.VALUES):
                self.cards.append({
                    'suit': suit,
                    'label': label,
                    'value': self.VALUE_MAP[label]
                })
        self.shuffle()
    
    def shuffle(self):
        """デッキをシャッフル"""
        random.shuffle(self.cards)
    
    def draw(self, count=1):
        """
        カードを引く
        
        Args:
            count (int): 引く枚数
        
        Returns:
            list: 引いたカードのリスト
        """
        if count > len(self.cards):
            raise ValueError(f"デッキに十分なカードがありません。残り: {len(self.cards)}枚")
        
        drawn_cards = []
        for _ in range(count):
            drawn_cards.append(self.cards.pop())
        return drawn_cards
    
    def remaining_cards(self):
        """残りのカード枚数を返す"""
        return len(self.cards)

