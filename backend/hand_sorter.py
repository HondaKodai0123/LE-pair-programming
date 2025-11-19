"""
手札の並び替えロジック
クライアント側と同じ並び替えロジックを実装
"""


def sort_hand(cards):
    """
    手札を自動的に並び替える
    ペアを左側に、残りを数字の小さい順に配置
    Aは1として扱い、A2345の順番にする
    
    Args:
        cards (list): カードのリスト [{'suit': '♠', 'label': 'A', 'value': 14}, ...]
    
    Returns:
        list: 並び替えられたカードのリスト
    """
    if not cards or len(cards) == 0:
        return []
    
    # カードをコピー
    sorted_cards = cards.copy()
    
    # Aを1として扱うための値を取得する関数
    def get_sort_value(card):
        # A（value=14）を1として扱う
        return 1 if card['value'] == 14 else card['value']
    
    # 1. 数字の値でグループ化（Aは1として扱う）
    value_groups = {}
    for card in sorted_cards:
        sort_value = get_sort_value(card)
        if sort_value not in value_groups:
            value_groups[sort_value] = []
        value_groups[sort_value].append(card)
    
    # 2. ペアと単独カードを分離
    pairs = []
    singles = []
    
    # 数値キーでソートしてから処理
    sorted_keys = sorted(value_groups.keys())
    
    for sort_value in sorted_keys:
        group = value_groups[sort_value]
        if len(group) >= 2:
            # ペア以上がある場合、スートでソート
            suit_order = {'♠': 0, '♥': 1, '♦': 2, '♣': 3}
            group.sort(key=lambda c: suit_order.get(c['suit'], 0))
            pairs.extend(group)
        else:
            singles.extend(group)
    
    # 3. ペアを数字の小さい順にソート（Aは1として扱う）
    pairs.sort(key=lambda x: (
        -len(value_groups[get_sort_value(x)]),  # ペアの種類（降順）
        get_sort_value(x),  # 数字（昇順）
        {'♠': 0, '♥': 1, '♦': 2, '♣': 3}.get(x['suit'], 0)  # スート（昇順）
    ))
    
    # 4. 単独カードを数字の小さい順にソート（Aは1として扱う）
    singles.sort(key=lambda x: (
        get_sort_value(x),  # 数字（昇順）
        {'♠': 0, '♥': 1, '♦': 2, '♣': 3}.get(x['suit'], 0)  # スート（昇順）
    ))
    
    # 5. ペアを左側に、単独カードを右側に配置
    return pairs + singles

