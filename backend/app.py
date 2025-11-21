"""
Flask + SocketIO ポーカーゲームサーバー
"""
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import os
from deck import Deck
from game_logic import PokerHand
from hand_sorter import sort_hand
from stats_manager import update_player_stats, get_player_stats, get_all_stats, reset_all_stats, reset_player_stats
import logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'poker-secret-key-2024'
CORS(app)

# SocketIOの初期化
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# ゲームの状態を管理（本来はRedisやDBを使うべきだが、シンプルのためメモリ管理）
games = {}


class GameRoom:
    """ゲームルームの状態を管理するクラス"""
    
    def __init__(self, room_id):
        self.room_id = room_id
        self.players = {}  # {socket_id: {'name': 'Player1', 'hand': [], 'ready': False}}
        self.deck = Deck()
        self.phase = 'waiting'  # waiting, dealing, draw_phase, result
        self.current_turn = None
        self.results = {}
        self.max_exchanges = None  # 最大交換回数（1, 2, 3のいずれか）
        self.current_exchange_round = 0  # 現在の交換ラウンド（0から開始）
        self.exchange_count = {}  # {socket_id: 交換回数}
        self.creator_socket_id = None  # ルーム作成者のsocket_id
    
    def add_player(self, socket_id, player_name):
        """プレイヤーを追加"""
        if len(self.players) >= 2:
            return False
        
        player_number = len(self.players) + 1
        self.players[socket_id] = {
            'name': player_name or f'Player{player_number}',
            'hand': [],
            'ready': False,
            'player_number': player_number
        }
        return True
    
    def remove_player(self, socket_id):
        """プレイヤーを削除"""
        if socket_id in self.players:
            del self.players[socket_id]
    
    def is_ready(self):
        """両プレイヤーが揃っているか"""
        return len(self.players) == 2
    
    def deal_cards(self):
        """カードを配る（初回のみ）"""
        # 初回のみデッキをリセットしてカードを配る
        if self.current_exchange_round == 0:
            self.deck.reset()
            for socket_id in self.players:
                hand = self.deck.draw(5)
                # クライアント側と同じ並び替えロジックを適用
                self.players[socket_id]['hand'] = sort_hand(hand)
                self.players[socket_id]['ready'] = False
            self.phase = 'draw_phase'
        else:
            # 2回目以降のラウンドでは、デッキをリセットせず、ready状態のみリセット
            for socket_id in self.players:
                self.players[socket_id]['ready'] = False
    
    def exchange_cards(self, socket_id, card_indices):
        """カードを交換する"""
        print(f'[DEBUG] exchange_cards開始: socket_id={socket_id}, card_indices={card_indices}, current_round={self.current_exchange_round}')
        
        if socket_id not in self.players:
            print(f'[DEBUG] exchange_cards失敗: プレイヤーが見つかりません socket_id={socket_id}')
            return False
        
        player = self.players[socket_id]
        
        # 既にこのラウンドで交換済みの場合はエラー
        if player['ready']:
            print(f'[DEBUG] exchange_cards失敗: プレイヤー {socket_id} ({player["name"]}) は既にこのラウンドで交換済みです (ready={player["ready"]}, current_round={self.current_exchange_round})')
            return False
        
        # 交換前の手札をログ出力
        hand_before = [f"{c['suit']}{c['label']}" for c in player['hand']]
        print(f'[DEBUG] 交換前の手札: {hand_before}')
        print(f'[DEBUG] 交換するカードのインデックス: {card_indices}')
        if card_indices:
            cards_to_exchange = [f"{player['hand'][i]['suit']}{player['hand'][i]['label']}" for i in card_indices if 0 <= i < len(player['hand'])]
            print(f'[DEBUG] 交換するカード: {cards_to_exchange}')
        
        # 指定されたカードを捨てて新しいカードを引く
        for index in sorted(card_indices, reverse=True):
            if 0 <= index < len(player['hand']):
                removed_card = player['hand'].pop(index)
                print(f'[DEBUG] カードを捨てました: インデックス={index}, カード={removed_card["suit"]}{removed_card["label"]}')
        
        # 新しいカードを引く
        new_cards = self.deck.draw(len(card_indices))
        new_cards_str = [f"{c['suit']}{c['label']}" for c in new_cards]
        print(f'[DEBUG] 新しいカードを引きました: {new_cards_str}, 残りデッキ={len(self.deck.cards)}枚')
        player['hand'].extend(new_cards)
        
        # 交換後もクライアント側と同じ並び替えロジックを適用
        player['hand'] = sort_hand(player['hand'])
        hand_after = [f"{c['suit']}{c['label']}" for c in player['hand']]
        print(f'[DEBUG] 交換後の手札（ソート後）: {hand_after}')
        
        player['ready'] = True
        print(f'[DEBUG] exchange_cards完了: socket_id={socket_id}, player_name={player["name"]}, ready={player["ready"]}, current_round={self.current_exchange_round}')
        return True
    
    def set_max_exchanges(self, max_exchanges):
        """最大交換回数を設定"""
        if max_exchanges in [1, 2, 3]:
            self.max_exchanges = max_exchanges
            self.current_exchange_round = 0
            self.exchange_count = {socket_id: 0 for socket_id in self.players}
            return True
        return False
    
    def increment_exchange_round(self):
        """交換ラウンドを増やす"""
        old_round = self.current_exchange_round
        self.current_exchange_round += 1
        print(f'[DEBUG] increment_exchange_round: {old_round} -> {self.current_exchange_round}, max_exchanges={self.max_exchanges}')
        
        # 全てのプレイヤーのready状態をリセット
        for socket_id, player in self.players.items():
            old_ready = player['ready']
            player['ready'] = False
            print(f'[DEBUG] プレイヤー {socket_id} ({player["name"]}) のreadyフラグをリセット: {old_ready} -> False')
        
        # 交換回数をリセット（ただし、これは累積カウントなのでリセットしない方が良いかも？）
        # self.exchange_count = {socket_id: 0 for socket_id in self.players}
        print(f'[DEBUG] increment_exchange_round完了: current_exchange_round={self.current_exchange_round}, 全プレイヤーのreadyをFalseにリセット')
    
    def is_exchange_rounds_complete(self):
        """全ての交換ラウンドが完了したか"""
        return self.max_exchanges is not None and self.current_exchange_round >= self.max_exchanges
    
    def all_players_ready(self):
        """全プレイヤーがカード交換を終えたか"""
        ready_status = {sid: p['ready'] for sid, p in self.players.items()}
        all_ready = all(p['ready'] for p in self.players.values())
        print(f'[DEBUG] all_players_ready: {ready_status} -> {all_ready}, current_round={self.current_exchange_round}')
        return all_ready
    
    def evaluate_hands(self):
        """全プレイヤーの手札を評価"""
        self.results = {}
        for socket_id, player in self.players.items():
            hand_result = PokerHand.evaluate_hand(player['hand'])
            self.results[socket_id] = {
                'player_name': player['name'],
                'hand': player['hand'],
                'hand_result': hand_result
            }
        self.phase = 'result'
    
    def determine_winner(self):
        """勝者を決定"""
        if len(self.results) != 2:
            return None
        
        player_ids = list(self.results.keys())
        hand1 = self.results[player_ids[0]]['hand_result']
        hand2 = self.results[player_ids[1]]['hand_result']
        
        winner_code = PokerHand.compare_hands(hand1, hand2)
        
        if winner_code == 1:
            return player_ids[0]
        elif winner_code == 2:
            return player_ids[1]
        else:
            return 'draw'
    
    def get_remaining_cards_list(self, socket_id=None):
        """
        残りのカードリストを返す（自分の手札以外の47枚）
        
        Args:
            socket_id: プレイヤーのsocket_id。指定された場合、そのプレイヤーの手札を除外する
        
        Returns:
            list: 自分の手札以外のカードリスト（相手の手札 + 山札）
        """
        # 全52枚のカードを取得
        all_cards = self.deck.get_all_cards()
        
        # 指定されたプレイヤーの手札を取得（自分の手札）
        if socket_id and socket_id in self.players:
            my_hand = self.players[socket_id]['hand']
        else:
            my_hand = []
        
        # 自分の手札を除外
        remaining = []
        for card in all_cards:
            # 同じカード（suitとvalueが一致）が自分の手札に含まれているかチェック
            is_in_my_hand = any(
                c['suit'] == card['suit'] and c['value'] == card['value']
                for c in my_hand
            )
            if not is_in_my_hand:
                remaining.append(card)
        
        return remaining
    
    def get_state(self):
        """ゲームの状態を返す"""
        return {
            'room_id': self.room_id,
            'phase': self.phase,
            'player_count': len(self.players),
            'players': [
                {
                    'name': p['name'],
                    'ready': p['ready'],
                    'player_number': p['player_number']
                }
                for p in self.players.values()
            ]
        }


# ルート
@app.route('/')
def index():
    """フロントエンドのindex.htmlを返す"""
    frontend_path = os.path.join(os.path.dirname(__file__), '../frontend')
    return send_from_directory(frontend_path, 'index.html')


@app.route('/<path:path>')
def static_files(path):
    """静的ファイルを返す"""
    frontend_path = os.path.join(os.path.dirname(__file__), '../frontend')
    return send_from_directory(frontend_path, path)


# SocketIOイベント
@socketio.on('connect')
def handle_connect():
    """クライアント接続時"""
    print(f'Client connected: {request.sid}')
    emit('connected', {'message': 'サーバーに接続しました'})


@socketio.on('disconnect')
def handle_disconnect():
    """クライアント切断時"""
    print(f'Client disconnected: {request.sid}')
    
    # プレイヤーをルームから削除
    for room_id, game in list(games.items()):
        if request.sid in game.players:
            game.remove_player(request.sid)
            socketio.emit('player_left', game.get_state(), room=room_id)
            
            # ルームが空になったら削除
            if len(game.players) == 0:
                del games[room_id]


@socketio.on('create_room')
def handle_create_room(data):
    """ルーム作成"""
    import random
    import string
    
    room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    player_name = data.get('player_name', 'Player1')
    
    # ゲームルームを作成
    game = GameRoom(room_id)
    games[room_id] = game
    
    # プレイヤーを追加
    game.add_player(request.sid, player_name)
    game.creator_socket_id = request.sid  # ルーム作成者のsocket_idを保存
    join_room(room_id)
    
    emit('room_created', {
        'room_id': room_id,
        'game_state': game.get_state(),
        'player_name': player_name
    })
    print(f'Room created: {room_id}')


@socketio.on('join_room')
def handle_join_room(data):
    """ルーム参加"""
    room_id = data.get('room_id')
    player_name = data.get('player_name', 'Player2')
    
    if room_id not in games:
        emit('error', {'message': 'ルームが見つかりません'})
        return
    
    game = games[room_id]
    
    if not game.add_player(request.sid, player_name):
        emit('error', {'message': 'ルームが満員です'})
        return
    
    join_room(room_id)
    
    emit('room_joined', {
        'room_id': room_id,
        'game_state': game.get_state(),
        'player_name': player_name
    })
    
    # 他のプレイヤーに通知
    socketio.emit('player_joined', game.get_state(), room=room_id)
    
    print(f'Player joined room: {room_id}')


@socketio.on('start_game')
def handle_start_game(data):
    """ゲーム開始（ルーム作成者のみ）"""
    room_id = data.get('room_id')
    
    if room_id not in games:
        emit('error', {'message': 'ルームが見つかりません'})
        return
    
    game = games[room_id]
    
    if not game.is_ready():
        emit('error', {'message': 'プレイヤーが揃っていません'})
        return
    
    # ルーム作成者か確認
    if game.creator_socket_id != request.sid:
        emit('error', {'message': 'ゲーム開始はルーム作成者のみ可能です'})
        return
    
    # ルーム作成者に交換回数選択を促す
    emit('select_exchange_count', {
        'room_id': room_id,
        'message': '交換回数を選択してください'
    })
    print(f'Exchange count selection requested for room: {room_id}')


@socketio.on('set_exchange_count')
def handle_set_exchange_count(data):
    """交換回数を設定してゲーム開始"""
    room_id = data.get('room_id')
    exchange_count = data.get('exchange_count')
    
    if room_id not in games:
        emit('error', {'message': 'ルームが見つかりません'})
        return
    
    game = games[room_id]
    
    # ルーム作成者か確認
    if game.creator_socket_id != request.sid:
        emit('error', {'message': '交換回数の設定はルーム作成者のみ可能です'})
        return
    
    # 交換回数を設定
    if not game.set_max_exchanges(exchange_count):
        emit('error', {'message': '無効な交換回数です。1、2、3のいずれかを選択してください'})
        return
    
    print(f'Exchange count set to {exchange_count} for room: {room_id}')
    
    # カードを配る
    game.deal_cards()
    
    # 各プレイヤーに手札を送信
    for socket_id, player in game.players.items():
        remaining_cards_list = game.get_remaining_cards_list(socket_id)
        remaining_cards_count = len(remaining_cards_list)
        
        socketio.emit('cards_dealt', {
            'hand': player['hand'],
            'game_state': game.get_state(),
            'remaining_cards': remaining_cards_count,
            'remaining_cards_list': remaining_cards_list,
            'max_exchanges': game.max_exchanges,
            'current_exchange_round': game.current_exchange_round + 1  # 表示用に+1（0ベースから1ベースに変換）
        }, room=socket_id)
    
    print(f'Game started in room: {room_id} with {exchange_count} exchange rounds')


@socketio.on('exchange_cards')
def handle_exchange_cards(data):
    """カード交換"""
    room_id = data.get('room_id')
    card_indices = data.get('card_indices', [])
    
    if room_id not in games:
        emit('error', {'message': 'ルームが見つかりません'})
        return
    
    game = games[room_id]
    
    # 交換回数が設定されていない場合はエラー
    if game.max_exchanges is None:
        emit('error', {'message': '交換回数が設定されていません'})
        return
    
    # 現在のプレイヤーの状態を確認
    if request.sid in game.players:
        player = game.players[request.sid]
        print(f'[DEBUG] 交換リクエスト: socket_id={request.sid}, player_name={player["name"]}, ready={player["ready"]}, current_round={game.current_exchange_round}, max_exchanges={game.max_exchanges}, card_indices={card_indices}')
        # 全プレイヤーの状態も確認
        for sid, p in game.players.items():
            hand_str = ', '.join([f"{c['suit']}{c['label']}" for c in p['hand']])
            print(f'[DEBUG] プレイヤー状態: socket_id={sid}, name={p["name"]}, ready={p["ready"]}, hand=[{hand_str}]')
    
    if not game.exchange_cards(request.sid, card_indices):
        print(f'[DEBUG] カード交換処理が失敗しました: socket_id={request.sid}')
        emit('error', {'message': 'カード交換に失敗しました。既にこのラウンドで交換済みの可能性があります。'})
        return
    
    # プレイヤーの交換回数を増やす
    if request.sid not in game.exchange_count:
        game.exchange_count[request.sid] = 0
    game.exchange_count[request.sid] += 1
    print(f'[DEBUG] プレイヤーの交換回数を更新: socket_id={request.sid}, exchange_count={game.exchange_count[request.sid]}')
    
    # 交換後の手札を送信
    player = game.players[request.sid]
    remaining_cards_list = game.get_remaining_cards_list(request.sid)
    remaining_cards_count = len(remaining_cards_list)
    
    emit_data = {
        'hand': player['hand'],
        'game_state': game.get_state(),
        'remaining_cards': remaining_cards_count,
        'remaining_cards_list': remaining_cards_list,
        'current_exchange_round': game.current_exchange_round + 1,  # 表示用に+1（0ベースから1ベースに変換）
        'exchange_count': game.exchange_count.get(request.sid, 0),
        'max_exchanges': game.max_exchanges
    }
    hand_str = ', '.join([f"{c['suit']}{c['label']}" for c in player['hand']])
    print(f'[DEBUG] cards_exchangedイベントを送信: socket_id={request.sid}, current_round={emit_data["current_exchange_round"]}, exchange_count={emit_data["exchange_count"]}, max_exchanges={emit_data["max_exchanges"]}, hand=[{hand_str}]')
    emit('cards_exchanged', emit_data)
    
    # 全員が交換を終えたら次のラウンドまたは結果判定
    all_ready = game.all_players_ready()
    print(f'[DEBUG] 全員の交換完了チェック: all_ready={all_ready}, current_round={game.current_exchange_round}, players_ready={[(sid, p["ready"]) for sid, p in game.players.items()]}')
    
    if all_ready:
        # 全員が交換を終えたことを通知
        all_ready_data = {
            'message': f'全員の交換が完了しました（{game.current_exchange_round + 1}/{game.max_exchanges}回目）',
            'current_round': game.current_exchange_round + 1,
            'max_rounds': game.max_exchanges
        }
        print(f'[DEBUG] all_players_readyイベントを送信: {all_ready_data}')
        socketio.emit('all_players_ready', all_ready_data, room=room_id)
        
        # 指定回数の交換が完了したか確認
        if game.current_exchange_round + 1 >= game.max_exchanges:
            print(f'[DEBUG] 全ての交換が完了しました。結果を判定します。current_round={game.current_exchange_round + 1}, max_exchanges={game.max_exchanges}')
            # 全ての交換が完了したので結果を判定
            def send_result_after_delay():
                import time
                time.sleep(3)  # 3秒待機してから結果を送信
                
                game.evaluate_hands()
                winner_id = game.determine_winner()
                
                # 各プレイヤーに結果を送信し、戦績を更新
                for socket_id in game.players:
                    player = game.players[socket_id]
                    winner_status = 'you' if winner_id == socket_id else ('opponent' if winner_id != 'draw' else 'draw')
                    result_data = {
                        'your_result': game.results[socket_id],
                        'opponent_result': game.results[[sid for sid in game.players.keys() if sid != socket_id][0]],
                        'winner': winner_status,
                        'game_state': game.get_state(),
                        'player_name': player['name']  # プレイヤー名を含める
                    }
                    
                    # サーバー側で戦績を更新
                    try:
                        updated_stats = update_player_stats(player['name'], result_data)
                        print(f'戦績を更新: player_name={player["name"]}, stats={updated_stats}')
                    except Exception as e:
                        print(f'戦績更新エラー: player_name={player["name"]}, error={e}')
                    
                    print(f'ゲーム結果を送信: socket_id={socket_id}, player_name={player["name"]}, winner={winner_status}')
                    socketio.emit('game_result', result_data, room=socket_id)
            
            socketio.start_background_task(send_result_after_delay)
        else:
            # 次の交換ラウンドに進む
            print(f'[DEBUG] 次のラウンドに進みます: current_exchange_round={game.current_exchange_round}, max_exchanges={game.max_exchanges}')
            game.increment_exchange_round()
            
            # 次のラウンド開始を通知（increment後なので、current_exchange_roundは既に増えている）
            # 表示用に+1（0ベースから1ベースに変換）
            display_round = game.current_exchange_round + 1
            next_round_data = {
                'message': f'第{display_round}回目の交換を開始してください',
                'current_round': display_round,  # 表示用に+1
                'max_rounds': game.max_exchanges
            }
            print(f'[DEBUG] next_exchange_roundイベントを送信: room_id={room_id}, data={next_round_data}')
            print(f'[DEBUG] 全プレイヤーの状態: {[(sid, p["name"], p["ready"]) for sid, p in game.players.items()]}')
            socketio.emit('next_exchange_round', next_round_data, room=room_id)
    else:
        # 相手が交換中であることを通知
        print(f'[DEBUG] 相手の交換を待っています。waiting_for_opponentイベントを送信')
        socketio.emit('waiting_for_opponent', game.get_state(), room=room_id)


@socketio.on('reset_game')
def handle_reset_game(data):
    """ゲームリセット"""
    room_id = data.get('room_id')
    
    if room_id not in games:
        emit('error', {'message': 'ルームが見つかりません'})
        return
    
    game = games[room_id]
    game.phase = 'waiting'
    game.results = {}
    
    for player in game.players.values():
        player['hand'] = []
        player['ready'] = False
    
    socketio.emit('game_reset', game.get_state(), room=room_id)
    print(f'Game reset in room: {room_id}')


@socketio.on('get_stats')
def handle_get_stats(data):
    """プレイヤーの戦績を取得"""
    try:
        player_name = data.get('player_name')
        
        if not player_name:
            emit('error', {'message': 'プレイヤー名が指定されていません'})
            print('戦績取得エラー: プレイヤー名が指定されていません')
            return
        
        print(f'戦績取得リクエスト: player_name={player_name}')
        stats = get_player_stats(player_name)
        emit('stats_response', {
            'player_name': player_name,
            'stats': stats
        })
        print(f'戦績を取得: player_name={player_name}, stats={stats}')
    except Exception as e:
        error_msg = f'戦績の取得に失敗しました: {str(e)}'
        emit('error', {'message': error_msg})
        print(f'戦績取得エラー: player_name={data.get("player_name", "unknown")}, error={e}')
        import traceback
        traceback.print_exc()


@socketio.on('get_all_stats')
def handle_get_all_stats():
    """全プレイヤーの戦績を取得"""
    try:
        print('全戦績取得リクエスト')
        all_stats = get_all_stats()
        emit('all_stats_response', {
            'stats': all_stats
        })
        print(f'全戦績を取得: {len(all_stats)} players')
    except Exception as e:
        error_msg = f'戦績の取得に失敗しました: {str(e)}'
        emit('error', {'message': error_msg})
        print(f'全戦績取得エラー: error={e}')
        import traceback
        traceback.print_exc()


@socketio.on('reset_stats')
def handle_reset_stats(data):
    """戦績をリセット（管理者用）"""
    player_name = data.get('player_name')
    
    try:
        if player_name:
            # 特定プレイヤーの戦績をリセット
            success = reset_player_stats(player_name)
            if success:
                emit('stats_reset_response', {
                    'message': f'プレイヤー {player_name} の戦績をリセットしました',
                    'player_name': player_name
                })
                print(f'戦績をリセット: player_name={player_name}')
            else:
                emit('error', {'message': f'プレイヤー {player_name} の戦績が見つかりませんでした'})
        else:
            # 全プレイヤーの戦績をリセット
            reset_all_stats()
            emit('stats_reset_response', {
                'message': '全プレイヤーの戦績をリセットしました'
            })
            print('全戦績をリセット')
    except Exception as e:
        emit('error', {'message': f'戦績のリセットに失敗しました: {str(e)}'})
        print(f'戦績リセットエラー: error={e}')


if __name__ == '__main__':
    print('🎮 Poker Server Starting...')
    print('📡 WebSocket server running on http://0.0.0.0:5000')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True)

