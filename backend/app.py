"""
Flask + SocketIO ポーカーゲームサーバー
"""
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import os
from deck import Deck
from game_logic import PokerHand
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
        """カードを配る"""
        self.deck.reset()
        for socket_id in self.players:
            self.players[socket_id]['hand'] = self.deck.draw(5)
            self.players[socket_id]['ready'] = False
        self.phase = 'draw_phase'
    
    def exchange_cards(self, socket_id, card_indices):
        """カードを交換する"""
        if socket_id not in self.players:
            return False
        
        player = self.players[socket_id]
        
        # 指定されたカードを捨てて新しいカードを引く
        for index in sorted(card_indices, reverse=True):
            if 0 <= index < len(player['hand']):
                player['hand'].pop(index)
        
        # 新しいカードを引く
        new_cards = self.deck.draw(len(card_indices))
        player['hand'].extend(new_cards)
        
        player['ready'] = True
        return True
    
    def all_players_ready(self):
        """全プレイヤーがカード交換を終えたか"""
        return all(p['ready'] for p in self.players.values())
    
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
    join_room(room_id)
    
    emit('room_created', {
        'room_id': room_id,
        'game_state': game.get_state()
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
        'game_state': game.get_state()
    })
    
    # 他のプレイヤーに通知
    socketio.emit('player_joined', game.get_state(), room=room_id)
    
    print(f'Player joined room: {room_id}')


@socketio.on('start_game')
def handle_start_game(data):
    """ゲーム開始"""
    room_id = data.get('room_id')
    
    if room_id not in games:
        emit('error', {'message': 'ルームが見つかりません'})
        return
    
    game = games[room_id]
    
    if not game.is_ready():
        emit('error', {'message': 'プレイヤーが揃っていません'})
        return
    
    # カードを配る
    game.deal_cards()
    
    # 各プレイヤーに手札を送信
    for socket_id, player in game.players.items():
        socketio.emit('cards_dealt', {
            'hand': player['hand'],
            'game_state': game.get_state()
        }, room=socket_id)
    
    print(f'Game started in room: {room_id}')


@socketio.on('exchange_cards')
def handle_exchange_cards(data):
    """カード交換"""
    room_id = data.get('room_id')
    card_indices = data.get('card_indices', [])
    
    if room_id not in games:
        emit('error', {'message': 'ルームが見つかりません'})
        return
    
    game = games[room_id]
    
    if not game.exchange_cards(request.sid, card_indices):
        emit('error', {'message': 'カード交換に失敗しました'})
        return
    
    # 交換後の手札を送信
    player = game.players[request.sid]
    emit('cards_exchanged', {
        'hand': player['hand'],
        'game_state': game.get_state()
    })
    
    # 全員が交換を終えたら結果判定
    if game.all_players_ready():
        game.evaluate_hands()
        winner_id = game.determine_winner()
        
        # 各プレイヤーに結果を送信
        for socket_id in game.players:
            result_data = {
                'your_result': game.results[socket_id],
                'opponent_result': game.results[[sid for sid in game.players.keys() if sid != socket_id][0]],
                'winner': 'you' if winner_id == socket_id else ('opponent' if winner_id != 'draw' else 'draw'),
                'game_state': game.get_state()
            }
            socketio.emit('game_result', result_data, room=socket_id)
    else:
        # 相手が交換中であることを通知
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


if __name__ == '__main__':
    print('🎮 Poker Server Starting...')
    print('📡 WebSocket server running on http://0.0.0.0:5000')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True)

