
console.log('[Socket.js] Loaded');
import { io } from 'socket.io-client';

// Dynamically build the URL using the current window location
console.log('[Socket.js] Attempting to create Socket.io client');
const socket = io({
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket'], // Force WebSocket to avoid polling issues
});

console.log('[Socket.js] Calling socket.connect() for debug');
socket.connect();

socket.on('connect', () => {
    console.log('[Socket.js] Socket.io connected', socket.id);
});
socket.on('connect_error', (err) => {
    console.log('[Socket.js] Socket.io connect_error', err);
});

export default socket;
