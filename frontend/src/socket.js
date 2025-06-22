import { io } from 'socket.io-client';

// Connect once at app start
const socket = io('http://localhost:3001');

export default socket;
