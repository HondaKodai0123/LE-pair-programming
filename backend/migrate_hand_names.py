"""
既存の戦績データの英語の役名を日本語に変換するスクリプト
"""
from stats_manager import load_stats, save_stats, translate_hand_name

def migrate_hand_names():
    """既存データの英語の役名を日本語に変換"""
    stats = load_stats()
    
    updated = False
    for player_name, player_stats in stats.items():
        if 'hands' in player_stats and player_stats['hands']:
            translated_hands = {}
            for eng_name, count in player_stats['hands'].items():
                ja_name = translate_hand_name(eng_name)
                # 既に日本語の役名がある場合は合算
                if ja_name in translated_hands:
                    translated_hands[ja_name] += count
                else:
                    translated_hands[ja_name] = count
            
            # 変更があった場合のみ更新
            if translated_hands != player_stats['hands']:
                player_stats['hands'] = translated_hands
                updated = True
                print(f'プレイヤー {player_name} の役名を変換: {player_stats["hands"]}')
    
    if updated:
        save_stats(stats)
        print('戦績データの役名を日本語に変換しました')
    else:
        print('変換が必要なデータはありませんでした')

if __name__ == '__main__':
    migrate_hand_names()

