// backend/test-socket-server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('joinRoom', (data) => {
        console.log('📥 joinRoom received:', data);
        const room = `session-${data.sessionId}`;
        socket.join(room);
        io.to(room).emit('userJoined', {
            id: socket.id,
            name: data.playerName,
        });
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

server.listen(4000, () => {
    console.log('🟢 Test Socket.IO server running at http://localhost:4000');
});
