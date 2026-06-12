'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket, onConnectionChange } from '@/lib/socket';
import {
    SocketEvents,
    type MoveTokenPayload,
    type AddTokenPayload,
    type RemoveTokenPayload,
    type FogRevealPayload,
    type DefilePayload,
    type RemoveDefilePayload,
    type UpdateSheetPayload,
    type UsePowerPayload,
    type DiceRollPayload,
    type ChatMessagePayload,
    type CampaignStatePayload,
    type TokenMovedPayload,
    type Token,
    type DefilePlacedPayload,
    type UserJoinedPayload,
    type UserLeftPayload,
    type ChatMessageBroadcast,
    type DiceRollResult,
    type SheetUpdatedPayload,
    type PowerUsedPayload,
} from 'athas-shared';

// ── Typed overloads for the returned emit/on functions ──────────

type EmitFn = {
    (event: typeof SocketEvents.CLIENT_MOVE_TOKEN, data: MoveTokenPayload): void;
    (event: typeof SocketEvents.CLIENT_ADD_TOKEN, data: AddTokenPayload): void;
    (event: typeof SocketEvents.CLIENT_REMOVE_TOKEN, data: RemoveTokenPayload): void;
    (event: typeof SocketEvents.CLIENT_FOG_REVEAL, data: FogRevealPayload): void;
    (event: typeof SocketEvents.CLIENT_FOG_RESET, data?: Record<string, never>): void;
    (event: typeof SocketEvents.CLIENT_DEFILE, data: DefilePayload): void;
    (event: typeof SocketEvents.CLIENT_REMOVE_DEFILE, data: RemoveDefilePayload): void;
    (event: typeof SocketEvents.CLIENT_DEFILE_RESET, data?: Record<string, never>): void;
    (event: typeof SocketEvents.CLIENT_UPDATE_SHEET, data: UpdateSheetPayload): void;
    (event: typeof SocketEvents.CLIENT_USE_POWER, data: UsePowerPayload): void;
    (event: typeof SocketEvents.CLIENT_ROLL_DICE, data: DiceRollPayload): void;
    (event: typeof SocketEvents.CLIENT_CHAT_MESSAGE, data: ChatMessagePayload): void;
    (event: string, data?: unknown): void;
};

type OnFn = {
    (event: typeof SocketEvents.SERVER_CAMPAIGN_STATE, handler: (data: CampaignStatePayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_TOKEN_MOVED, handler: (data: TokenMovedPayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_TOKEN_ADDED, handler: (data: Token) => void): () => void;
    (event: typeof SocketEvents.SERVER_TOKEN_REMOVED, handler: (data: RemoveTokenPayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_FOG_UPDATED, handler: (data: { fogMask: string }) => void): () => void;
    (event: typeof SocketEvents.SERVER_FOG_RESET, handler: () => void): () => void;
    (event: typeof SocketEvents.SERVER_DEFILE_PLACED, handler: (data: DefilePlacedPayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_DEFILE_REMOVED, handler: (data: RemoveDefilePayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_DEFILE_RESET, handler: () => void): () => void;
    (event: typeof SocketEvents.SERVER_USER_JOINED, handler: (data: UserJoinedPayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_USER_LEFT, handler: (data: UserLeftPayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_CHAT_MESSAGE, handler: (data: ChatMessageBroadcast) => void): () => void;
    (event: typeof SocketEvents.SERVER_DICE_RESULT, handler: (data: DiceRollResult) => void): () => void;
    (event: typeof SocketEvents.SERVER_SHEET_UPDATED, handler: (data: SheetUpdatedPayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_POWER_USED, handler: (data: PowerUsedPayload) => void): () => void;
    (event: typeof SocketEvents.SERVER_ERROR, handler: (data: { message: string }) => void): () => void;
    (event: string, handler: (...args: unknown[]) => void): () => void;
};

/**
 * React hook that manages the Socket.io lifecycle.
 * Connects on mount, disconnects on unmount.
 */
export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Get session from localStorage
        const sessionStr = localStorage.getItem('athas_session');
        if (!sessionStr) return;

        try {
            const session = JSON.parse(sessionStr);
            socketRef.current = connectSocket(session.sessionToken, session.campaignId);
        } catch {
            console.error('[useSocket] Invalid session data');
        }

        // Subscribe to connection state changes
        const unsubscribe = onConnectionChange((connected) => {
            setIsConnected(connected);
        });

        return () => {
            unsubscribe();
            disconnectSocket();
            socketRef.current = null;
        };
    }, []);

    const emit: EmitFn = useCallback((event: string, data?: unknown) => {
        socketRef.current?.emit(event, data);
    }, []);

    const on: OnFn = useCallback((event: string, handler: (...args: unknown[]) => void) => {
        socketRef.current?.on(event, handler);
        return () => {
            socketRef.current?.off(event, handler);
        };
    }, []) as OnFn;

    return { socket: socketRef.current, emit, on, isConnected };
}
