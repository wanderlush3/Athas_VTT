// Re-export shared types for convenience
export type {
    Token,
    DefileZone,
    DiceRollResult,
    DiceRollPayload,
    CampaignStatePayload,
    ChatMessageBroadcast,
    UserInfo,
    UserRole,
    DieType,
    SessionData,
} from 'athas-shared';

// ── Client-only types ────────────────────────────────────────────

export interface MapState {
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetY: number;
}

export type GMTool = 'select' | 'fog_brush' | 'defile' | 'token_place';
