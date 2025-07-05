// backend/utils/socketInstance.js

let io = null;

/**
 * Sets the Socket.IO instance to be shared across files.
 * This should be called once in index.js after creating the server.
 * @param {import('socket.io').Server} ioInstance
 */

function setIO(ioInstance) {
    io = ioInstance;
}

/**
 * Gets the shared Socket.IO instance.
 * Call this anywhere you need access to the live Socket.IO server.
 * @returns {import('socket.io').Server}
 */

function getIO() {
    if (!io) {
        throw new Error('Socket.IO instance has not been set. Make sure to call setIO() in index.js first.');
    }
    return io;
}

module.exports = { setIO, getIO };
