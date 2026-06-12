import { create } from 'zustand';
import type { Token, DefileZone } from 'athas-shared';

interface GameState {
    // Map
    mapImageUrl: string | null;
    tokens: Token[];
    defileZones: DefileZone[];
    fogMask: string;

    // Users
    connectedUsers: Array<{ id: string; username: string; role: string }>;

    // Actions
    setMapImage: (url: string | null) => void;
    setTokens: (tokens: Token[]) => void;
    addToken: (token: Token) => void;
    moveToken: (tokenId: string, x: number, y: number) => void;
    removeToken: (tokenId: string) => void;
    setDefileZones: (zones: DefileZone[]) => void;
    addDefileZone: (zone: DefileZone) => void;
    removeDefileZone: (id: string) => void;
    setFogMask: (mask: string | ((prev: string) => string)) => void;
    setConnectedUsers: (users: Array<{ id: string; username: string; role: string }>) => void;
    addUser: (user: { id: string; username: string; role: string }) => void;
    removeUser: (userId: string) => void;
}

export const useGameState = create<GameState>((set) => ({
    mapImageUrl: null,
    tokens: [],
    defileZones: [],
    fogMask: '[]',
    connectedUsers: [],

    setMapImage: (url) => set({ mapImageUrl: url }),
    setTokens: (tokens) => set({ tokens }),
    addToken: (token) => set((s) => ({ tokens: [...s.tokens, token] })),
    moveToken: (tokenId, x, y) =>
        set((s) => ({
            tokens: s.tokens.map((t) => (t.id === tokenId ? { ...t, x, y } : t)),
        })),
    removeToken: (tokenId) =>
        set((s) => ({ tokens: s.tokens.filter((t) => t.id !== tokenId) })),
    setDefileZones: (zones) => set({ defileZones: zones }),
    addDefileZone: (zone) => set((s) => ({ defileZones: [...s.defileZones, zone] })),
    removeDefileZone: (id) =>
        set((s) => ({ defileZones: s.defileZones.filter((z) => z.id !== id) })),
    setFogMask: (mask) => set((s) => ({
        fogMask: typeof mask === 'function' ? mask(s.fogMask) : mask,
    })),
    setConnectedUsers: (users) => set({ connectedUsers: users }),
    addUser: (user) => set((s) => ({ connectedUsers: [...s.connectedUsers, user] })),
    removeUser: (userId) =>
        set((s) => ({ connectedUsers: s.connectedUsers.filter((u) => u.id !== userId) })),
}));
