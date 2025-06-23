// frontend/src/TestSocket.jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000'); // Match the test server port

function TestSocket() {
    const [status, setStatus] = useState('Connecting...');
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);
            setStatus('Connected!');

            const testPayload = {
                sessionId: 'TEST123',
                playerName: `Player-${socket.id.slice(0, 4)}`,
            };

            console.log('➡️ Emitting joinRoom:', testPayload);
            socket.emit('joinRoom', testPayload);
        });

        socket.on('userJoined', (player) => {
            console.log('👤 User joined received:', player);
            setPlayers((prev) => [...prev, player]);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            setStatus('Disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('⚠️ Connect error:', err.message);
            setStatus('Connection failed');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div style={{ padding: '1rem' }}>
        <h2>🧪 Socket Test</h2>
        <p>Status: {status}</p>
        <h3>Players in room:</h3>
        <ul>
        {players.map((p) => (
            <li key={p.id}>{p.name}</li>
        ))}
        </ul>
        </div>
    );
}

export default TestSocket;
