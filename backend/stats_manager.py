"""
プレイヤー戦績管理モジュール
サーバー側で戦績をJSONファイルに保存・管理
"""
import json
import os
from datetime import datetime
from threading import Lock

# 戦績データの保存先
STATS_FILE = 'player_stats.json'
# ファイルアクセスの排他制御用ロック
stats_lock = Lock()


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
        except (json.JSONDecodeError, FileNotFoundError):
            return {}


def save_stats(stats):
    """戦績データを保存"""
    ensure_stats_file()
    with stats_lock:
        with open(STATS_FILE, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)


def get_player_stats(player_name):
    """プレイヤーの戦績を取得"""
    stats = load_stats()
    return stats.get(player_name, {
        'totalGames': 0,
        'wins': 0,
        'losses': 0,
        'draws': 0,
        'hands': {},
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    })


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
    
    # 出した役を記録
    hand_name = game_result.get('your_result', {}).get('hand_result', {}).get('hand_name', '')
    if hand_name:
        if 'hands' not in player_stats:
            player_stats['hands'] = {}
        player_stats['hands'][hand_name] = player_stats['hands'].get(hand_name, 0) + 1
    
    # 更新日時を記録
    player_stats['updated_at'] = datetime.now().isoformat()
    
    # 保存
    stats[player_name] = player_stats
    save_stats(stats)
    
    return player_stats


def get_all_stats():
    """全プレイヤーの戦績を取得"""
    return load_stats()


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

