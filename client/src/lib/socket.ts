import { io, Socket } from 'socket.io-client';
import { getServerUrl } from './api';
import { SocketEvents } from 'athas-shared';

const isDev = process.env.NODE_ENV !== 'production';

let socket: Socket | null = null;
let socketUrl: string | null = null;
let storedSessionToken: string | null = null;
let storedCampaignId: string | null = null;
const connectionChangeCallbacks = new Set<(connected: boolean) => void>();

/**
 * Get or create a Socket.io client singleton.
 * Recreates the socket if the server URL has changed.
 */
export function getSocket(): Socket {
    const currentUrl = getServerUrl();

    // If the server URL changed, tear down the old socket
    if (socket && socketUrl !== currentUrl) {
        socket.disconnect();
        socket = null;
        socketUrl = null;
    }

    if (!socket) {
        socketUrl = currentUrl;
        socket = io(currentUrl, {
            autoConnect: false,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        // ── Connection lifecycle events ─────────────────────────
        socket.on('connect', () => {
            console.log('[Socket] Connected');
            connectionChangeCallbacks.forEach(cb => cb(true));

            // Re-join campaign room on reconnect (not first connect — connectSocket handles that)
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Disconnected: ${reason}`);
            connectionChangeCallbacks.forEach(cb => cb(false));
        });

        socket.io.on('reconnect', (attemptNumber) => {
            console.log(`[Socket] Reconnected after ${attemptNumber} attempt(s)`);

            // Re-join the campaign room with stored credentials
            if (storedSessionToken && storedCampaignId && socket) {
                socket.emit(SocketEvents.CLIENT_JOIN_CAMPAIGN, {
                    sessionToken: storedSessionToken,
                    campaignId: storedCampaignId,
                });
                if (isDev) console.log('[Socket] Re-joined campaign room');
            }
        });

        socket.io.on('reconnect_attempt', (attemptNumber) => {
            if (isDev) console.log(`[Socket] Reconnection attempt #${attemptNumber}`);
        });

        socket.io.on('reconnect_error', (err) => {
            console.warn('[Socket] Reconnection error:', err.message);
        });
    }
    return socket;
}

/**
 * Connect to the server and join a campaign room.
 */
export function connectSocket(sessionToken: string, campaignId: string): Socket {
    // Store credentials for reconnection
    storedSessionToken = sessionToken;
    storedCampaignId = campaignId;

    const s = getSocket();

    if (!s.connected) {
        s.connect();
    }

    s.emit(SocketEvents.CLIENT_JOIN_CAMPAIGN, { sessionToken, campaignId });
    return s;
}

/**
 * Disconnect and clean up the socket.
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    storedSessionToken = null;
    storedCampaignId = null;
    connectionChangeCallbacks.clear();
}

/**
 * Register a callback for connection state changes.
 * Returns an unsubscribe function.
 */
export function onConnectionChange(callback: (connected: boolean) => void): () => void {
    connectionChangeCallbacks.add(callback);
    return () => {
        connectionChangeCallbacks.delete(callback);
    };
}
