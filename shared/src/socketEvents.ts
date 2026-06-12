// ─── Socket.io Event Names ───────────────────────────────────────
// Prefixed: client: = client→server, server: = server→client/broadcast

export const SocketEvents = {
    // Connection & Session
    CLIENT_JOIN_CAMPAIGN: 'client:join_campaign',
    SERVER_CAMPAIGN_STATE: 'server:campaign_state',
    SERVER_USER_JOINED: 'server:user_joined',
    SERVER_USER_LEFT: 'server:user_left',

    // Map & Tokens
    CLIENT_MOVE_TOKEN: 'client:move_token',
    SERVER_TOKEN_MOVED: 'server:token_moved',
    CLIENT_ADD_TOKEN: 'client:add_token',
    SERVER_TOKEN_ADDED: 'server:token_added',
    CLIENT_REMOVE_TOKEN: 'client:remove_token',
    SERVER_TOKEN_REMOVED: 'server:token_removed',

    // Fog of War
    CLIENT_FOG_REVEAL: 'client:fog_reveal',
    SERVER_FOG_UPDATED: 'server:fog_updated',
    CLIENT_FOG_RESET: 'client:fog_reset',
    SERVER_FOG_RESET: 'server:fog_reset',

    // Defiling
    CLIENT_DEFILE: 'client:defile',
    SERVER_DEFILE_PLACED: 'server:defile_placed',
    CLIENT_REMOVE_DEFILE: 'client:remove_defile',
    SERVER_DEFILE_REMOVED: 'server:defile_removed',
    CLIENT_DEFILE_RESET: 'client:defile_reset',
    SERVER_DEFILE_RESET: 'server:defile_reset',

    // Character Sheets
    CLIENT_UPDATE_SHEET: 'client:update_sheet',
    SERVER_SHEET_UPDATED: 'server:sheet_updated',
    CLIENT_USE_POWER: 'client:use_power',
    SERVER_POWER_USED: 'server:power_used',

    // Dice & Chat
    CLIENT_ROLL_DICE: 'client:roll_dice',
    SERVER_DICE_RESULT: 'server:dice_result',
    CLIENT_CHAT_MESSAGE: 'client:chat_message',
    SERVER_CHAT_MESSAGE: 'server:chat_message',

    // Errors
    SERVER_ERROR: 'server:error',
} as const;

// ─── Payload Types ───────────────────────────────────────────────

// -- Connection --
export interface JoinCampaignPayload {
    sessionToken: string;
    campaignId: string;
}

export interface CampaignStatePayload {
    campaignId: string;
    mapImageUrl: string | null;
    fogMask: string;
    defileZones: DefileZone[];
    tokens: Token[];
    users: UserInfo[];
}

export interface UserJoinedPayload {
    userId: string;
    username: string;
    role: UserRole;
}

export interface UserLeftPayload {
    userId: string;
    username: string;
}

// -- Tokens --
export interface Token {
    id: string;
    imageUrl: string;
    x: number;
    y: number;
    label: string;
    size: number;
}

export interface MoveTokenPayload {
    tokenId: string;
    x: number;
    y: number;
}

export interface TokenMovedPayload extends MoveTokenPayload {
    movedBy: string;
}

export interface AddTokenPayload {
    imageUrl: string;
    x: number;
    y: number;
    label: string;
    size: number;
}

export interface RemoveTokenPayload {
    tokenId: string;
}

// -- Fog of War --
export interface FogRevealPayload {
    points: Array<{ x: number; y: number }>;
    brushSize: number;
}

// -- Defiling --
export interface DefileZone {
    id: string;
    x: number;
    y: number;
    radius: number;
}

export interface DefilePayload {
    x: number;
    y: number;
    radius: number;
}

export interface DefilePlacedPayload extends DefileZone { }

export interface RemoveDefilePayload {
    id: string;
}

// -- Character Sheets --
export interface UpdateSheetPayload {
    characterId: string;
    field: string;
    value: string | number | boolean;
}

export interface SheetUpdatedPayload extends UpdateSheetPayload {
    updatedBy: string;
}

export interface UsePowerPayload {
    characterId: string;
    powerIndex: number;
    cost: number;
}

export interface PowerUsedPayload {
    characterId: string;
    powerName: string;
    cost: number;
    newPsp: number;
    rollData?: DiceRollResult;
}

// -- Dice & Chat --
export interface DieRoll {
    type: DieType;
    count: number;
}

export interface DiceRollPayload {
    dice: DieRoll[];
    modifier?: number;
    label?: string;
}

export interface DiceRollResult {
    userId: string;
    username: string;
    dice: DieRoll[];
    results: number[];
    total: number;
    formula: string;
    label?: string;
}

export interface ChatMessagePayload {
    content: string;
}

export interface ChatMessageBroadcast {
    id: string;
    userId: string;
    username: string;
    content: string;
    timestamp: string;
}

// -- User Info --
export interface UserInfo {
    id: string;
    username: string;
    role: UserRole;
}

export type UserRole = 'GM' | 'PLAYER';
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

// ─── Socket Metadata ─────────────────────────────────────────────
// Custom data attached to each authenticated socket via socket.data

export interface SocketData {
    userId: string;
    username: string;
    role: UserRole;
    campaignId: string;
}

// ─── Typed Event Maps (for Socket.io generics) ──────────────────

export interface ClientToServerEvents {
    [SocketEvents.CLIENT_JOIN_CAMPAIGN]: (data: JoinCampaignPayload) => void;
    [SocketEvents.CLIENT_MOVE_TOKEN]: (data: MoveTokenPayload) => void;
    [SocketEvents.CLIENT_ADD_TOKEN]: (data: AddTokenPayload) => void;
    [SocketEvents.CLIENT_REMOVE_TOKEN]: (data: RemoveTokenPayload) => void;
    [SocketEvents.CLIENT_FOG_REVEAL]: (data: FogRevealPayload) => void;
    [SocketEvents.CLIENT_FOG_RESET]: () => void;
    [SocketEvents.CLIENT_DEFILE]: (data: DefilePayload) => void;
    [SocketEvents.CLIENT_REMOVE_DEFILE]: (data: RemoveDefilePayload) => void;
    [SocketEvents.CLIENT_DEFILE_RESET]: () => void;
    [SocketEvents.CLIENT_UPDATE_SHEET]: (data: UpdateSheetPayload) => void;
    [SocketEvents.CLIENT_USE_POWER]: (data: UsePowerPayload) => void;
    [SocketEvents.CLIENT_ROLL_DICE]: (data: DiceRollPayload) => void;
    [SocketEvents.CLIENT_CHAT_MESSAGE]: (data: ChatMessagePayload) => void;
}

export interface ServerToClientEvents {
    [SocketEvents.SERVER_CAMPAIGN_STATE]: (data: CampaignStatePayload) => void;
    [SocketEvents.SERVER_USER_JOINED]: (data: UserJoinedPayload) => void;
    [SocketEvents.SERVER_USER_LEFT]: (data: UserLeftPayload) => void;
    [SocketEvents.SERVER_TOKEN_MOVED]: (data: TokenMovedPayload) => void;
    [SocketEvents.SERVER_TOKEN_ADDED]: (data: Token) => void;
    [SocketEvents.SERVER_TOKEN_REMOVED]: (data: RemoveTokenPayload) => void;
    [SocketEvents.SERVER_FOG_UPDATED]: (data: { fogMask: string }) => void;
    [SocketEvents.SERVER_FOG_RESET]: () => void;
    [SocketEvents.SERVER_DEFILE_PLACED]: (data: DefilePlacedPayload) => void;
    [SocketEvents.SERVER_DEFILE_REMOVED]: (data: RemoveDefilePayload) => void;
    [SocketEvents.SERVER_DEFILE_RESET]: () => void;
    [SocketEvents.SERVER_SHEET_UPDATED]: (data: SheetUpdatedPayload) => void;
    [SocketEvents.SERVER_POWER_USED]: (data: PowerUsedPayload) => void;
    [SocketEvents.SERVER_DICE_RESULT]: (data: DiceRollResult) => void;
    [SocketEvents.SERVER_CHAT_MESSAGE]: (data: ChatMessageBroadcast) => void;
    [SocketEvents.SERVER_ERROR]: (data: { message: string }) => void;
}
