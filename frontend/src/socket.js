import { io } from 'socket.io-client';

// Dynamically build the URL using the current window location
const socket = io(`${window.location.protocol}//${window.location.hostname}:3001`, {
    transports: ['websocket'], // Force WebSocket to avoid polling issues
});

export default socket;
