"""
プレイヤー戦績管理モジュール
サーバー側で戦績をJSONファイルに保存・管理
"""
import json
import os
from datetime import datetime
from threading import Lock

# 戦績データの保存先（backendディレクトリに保存）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATS_FILE = os.path.join(BASE_DIR, 'player_stats.json')
# ファイルアクセスの排他制御用ロック
stats_lock = Lock()

# 役名の英語→日本語変換マップ
HAND_NAME_MAP = {
    'Royal Flush': 'ロイヤルフラッシュ',
    'Straight Flush': 'ストレートフラッシュ',
    'Four of a Kind': 'フォーカード',
    'Full House': 'フルハウス',
    'Flush': 'フラッシュ',
    'Straight': 'ストレート',
    'Three of a Kind': 'スリーカード',
    'Two Pair': 'ツーペア',
    'One Pair': 'ワンペア',
    'High Card': 'ハイカード'
}


def translate_hand_name(english_name):
    """英語の役名を日本語に変換"""
    return HAND_NAME_MAP.get(english_name, english_name)


def ensure_stats_file():
    """戦績ファイルが存在しない場合は作成"""
    if not os.path.exists(STATS_FILE):
        with open(STATS_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f, ensure_ascii=False, indent=2)


def load_stats():
    """戦績データを読み込む"""
    ensure_stats_file()
    with stats_lock:
        try:
            with open(STATS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f'戦績データ読み込みエラー: {e}, file={STATS_FILE}')
            return {}
        except Exception as e:
            print(f'戦績データ読み込み予期しないエラー: {e}, file={STATS_FILE}')
            import traceback
            traceback.print_exc()
            return {}


def save_stats(stats):
    """戦績データを保存"""
    ensure_stats_file()
    with stats_lock:
        try:
            with open(STATS_FILE, 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f'戦績データ保存エラー: {e}, file={STATS_FILE}')
            import traceback
            traceback.print_exc()
            raise


def get_player_stats(player_name):
    """プレイヤーの戦績を取得（既存データの英語役名も日本語に変換）"""
    stats = load_stats()
    player_stats = stats.get(player_name, {
        'totalGames': 0,
        'wins': 0,
        'losses': 0,
        'draws': 0,
        'hands': {},
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    })
    
    # 既存のhandsデータが英語の役名の場合、日本語に変換
    if 'hands' in player_stats and player_stats['hands']:
        translated_hands = {}
        for eng_name, count in player_stats['hands'].items():
            ja_name = translate_hand_name(eng_name)
            # 既に日本語の役名がある場合は合算
            if ja_name in translated_hands:
                translated_hands[ja_name] += count
            else:
                translated_hands[ja_name] = count
        player_stats['hands'] = translated_hands
    
    return player_stats


def update_player_stats(player_name, game_result):
    """
    プレイヤーの戦績を更新
    
    Args:
        player_name: プレイヤー名
        game_result: ゲーム結果データ
            {
                'winner': 'you' | 'opponent' | 'draw',
                'your_result': {
                    'hand_result': {
                        'hand_name': '役名'
                    }
                }
            }
    """
    stats = load_stats()
    
    # プレイヤーの戦績を取得（存在しない場合は新規作成）
    player_stats = stats.get(player_name, {
        'totalGames': 0,
        'wins': 0,
        'losses': 0,
        'draws': 0,
        'hands': {},
        'created_at': datetime.now().isoformat()
    })
    
    # 対戦数を増やす
    player_stats['totalGames'] = player_stats.get('totalGames', 0) + 1
    
    # 勝敗を更新
    winner = game_result.get('winner', 'draw')
    if winner == 'you':
        player_stats['wins'] = player_stats.get('wins', 0) + 1
    elif winner == 'opponent':
        player_stats['losses'] = player_stats.get('losses', 0) + 1
    else:
        player_stats['draws'] = player_stats.get('draws', 0) + 1
    
    # 出した役を記録（英語→日本語に変換）
    hand_name_en = game_result.get('your_result', {}).get('hand_result', {}).get('hand_name', '')
    if hand_name_en:
        # 英語の役名を日本語に変換
        hand_name_ja = translate_hand_name(hand_name_en)
        if 'hands' not in player_stats:
            player_stats['hands'] = {}
        player_stats['hands'][hand_name_ja] = player_stats['hands'].get(hand_name_ja, 0) + 1
    
    # 更新日時を記録
    player_stats['updated_at'] = datetime.now().isoformat()
    
    # 保存
    stats[player_name] = player_stats
    save_stats(stats)
    
    return player_stats


def get_all_stats():
    """全プレイヤーの戦績を取得（既存データの英語役名も日本語に変換）"""
    all_stats = load_stats()
    
    # 各プレイヤーのhandsデータを変換
    for player_name in all_stats:
        if 'hands' in all_stats[player_name] and all_stats[player_name]['hands']:
            translated_hands = {}
            for eng_name, count in all_stats[player_name]['hands'].items():
                ja_name = translate_hand_name(eng_name)
                # 既に日本語の役名がある場合は合算
                if ja_name in translated_hands:
                    translated_hands[ja_name] += count
                else:
                    translated_hands[ja_name] = count
            all_stats[player_name]['hands'] = translated_hands
    
    return all_stats


def reset_all_stats():
    """全プレイヤーの戦績をリセット"""
    with stats_lock:
        with open(STATS_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f, ensure_ascii=False, indent=2)
    return True


def reset_player_stats(player_name):
    """特定プレイヤーの戦績をリセット"""
    stats = load_stats()
    if player_name in stats:
        del stats[player_name]
        save_stats(stats)
        return True
    return False

