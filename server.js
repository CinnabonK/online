// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server); // サーバーとSocket.IOを接続

// ルーム情報を保存
let rooms = {};

// 静的ファイルを提供 (publicフォルダ)
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IOの接続管理
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // ルーム作成
    socket.on('createRoom', (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [], gameData: Array(9).fill(null) };
            socket.join(roomId);
            rooms[roomId].players.push(socket.id);
            socket.emit('roomCreated', roomId);
        } else {
            socket.emit('roomExists', roomId);
        }
    });

    // ルームに参加
    socket.on('joinRoom', (roomId) => {
        const room = rooms[roomId];
        if (room && room.players.length < 2) {
            socket.join(roomId);
            room.players.push(socket.id);
            io.to(roomId).emit('startGame', roomId);
        } else {
            socket.emit('roomFull', roomId);
        }
    });

    // プレイヤーがマスをクリックしたときの処理
    socket.on('makeMove', ({ roomId, index, player }) => {
        const room = rooms[roomId];
        if (room) {
            room.gameData[index] = player;
            io.to(roomId).emit('updateBoard', room.gameData);

            // 勝敗判定
            const winner = checkWinner(room.gameData);
            if (winner) {
                io.to(roomId).emit('gameOver', winner);
            }
        }
    });

    // プレイヤーが切断した場合
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.players.includes(socket.id)) {
                room.players = room.players.filter(player => player !== socket.id);
                if (room.players.length === 0) {
                    delete rooms[roomId]; // ルームが空なら削除
                }
            }
        }
    });
});

// 勝敗判定のロジック
function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // 勝者を返す
        }
    }
    return null;
}

// サーバーの起動
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
