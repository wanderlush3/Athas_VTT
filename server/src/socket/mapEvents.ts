import { Server, Socket } from 'socket.io';
import {
    SocketEvents,
    SocketData,
    ClientToServerEvents,
    ServerToClientEvents,
    MoveTokenPayload,
    AddTokenPayload,
    RemoveTokenPayload,
    FogRevealPayload,
    DefilePayload,
    RemoveDefilePayload,
    Token,
    DefileZone,
} from 'athas-shared';
import { v4 as uuidv4 } from 'uuid';
import { isGM } from './guards';
import { updateCampaignJsonField } from './helpers';
import { logger } from '../logger';
import {
    MoveTokenSchema, AddTokenSchema, RemoveTokenSchema,
    FogRevealSchema, DefileSchema, RemoveDefileSchema,
} from '../validation/schemas';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/**
 * Map & Token Socket Events
 * Handles token CRUD and fog of war / defiling operations on the canvas.
 */
export function registerMapEvents(io: TypedServer, socket: TypedSocket, campaignId: string, userId: string) {
    // ── Token Movement ──────────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_MOVE_TOKEN, async (data: MoveTokenPayload) => {
        try {
            const parsed = MoveTokenSchema.safeParse(data);
            if (!parsed.success) { logger.warn({ errors: parsed.error.issues }, 'Invalid move token payload'); return; }

            await updateCampaignJsonField<Token>(campaignId, 'tokenState', (tokens) => {
                const token = tokens.find((t) => t.id === parsed.data.tokenId);
                if (token) {
                    token.x = parsed.data.x;
                    token.y = parsed.data.y;
                }
                return tokens;
            });

            socket.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_TOKEN_MOVED, {
                tokenId: parsed.data.tokenId,
                x: parsed.data.x,
                y: parsed.data.y,
                movedBy: userId,
            });
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Move token error');
        }
    });

    // ── Add Token (GM only) ────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_ADD_TOKEN, async (data: AddTokenPayload) => {
        try {
            if (!isGM(socket)) { socket.emit(SocketEvents.SERVER_ERROR, { message: 'Only the GM can add tokens' }); return; }

            const parsed = AddTokenSchema.safeParse(data);
            if (!parsed.success) { logger.warn({ errors: parsed.error.issues }, 'Invalid add token payload'); return; }

            const newToken = { id: uuidv4(), ...parsed.data } as Token;

            await updateCampaignJsonField<Token>(campaignId, 'tokenState', (tokens) => {
                tokens.push(newToken);
                return tokens;
            });

            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_TOKEN_ADDED, newToken);
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Add token error');
        }
    });

    // ── Remove Token (GM only) ─────────────────────────────────────
    socket.on(SocketEvents.CLIENT_REMOVE_TOKEN, async (data: RemoveTokenPayload) => {
        try {
            if (!isGM(socket)) { socket.emit(SocketEvents.SERVER_ERROR, { message: 'Only the GM can remove tokens' }); return; }

            const parsed = RemoveTokenSchema.safeParse(data);
            if (!parsed.success) { logger.warn({ errors: parsed.error.issues }, 'Invalid remove token payload'); return; }

            await updateCampaignJsonField<Token>(campaignId, 'tokenState', (tokens) =>
                tokens.filter((t) => t.id !== parsed.data.tokenId),
            );

            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_TOKEN_REMOVED, { tokenId: parsed.data.tokenId });
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Remove token error');
        }
    });

    // ── Fog of War ──────────────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_FOG_REVEAL, async (data: FogRevealPayload) => {
        try {
            if (!isGM(socket)) { socket.emit(SocketEvents.SERVER_ERROR, { message: 'Only the GM can reveal fog' }); return; }

            const parsed = FogRevealSchema.safeParse(data);
            if (!parsed.success) { logger.warn({ errors: parsed.error.issues }, 'Invalid fog reveal payload'); return; }

            const updated = await updateCampaignJsonField(campaignId, 'fogMask', (mask: unknown[]) => {
                mask.push({ points: parsed.data.points, brushSize: parsed.data.brushSize });
                return mask;
            });

            socket.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_FOG_UPDATED, { fogMask: JSON.stringify(updated) });
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Fog reveal error');
        }
    });

    socket.on(SocketEvents.CLIENT_FOG_RESET, async () => {
        try {
            if (!isGM(socket)) { socket.emit(SocketEvents.SERVER_ERROR, { message: 'Only the GM can reset fog' }); return; }

            await updateCampaignJsonField(campaignId, 'fogMask', () => []);
            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_FOG_RESET);
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Fog reset error');
        }
    });

    // ── Defiling ────────────────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_DEFILE, async (data: DefilePayload) => {
        try {
            const parsed = DefileSchema.safeParse(data);
            if (!parsed.success) { logger.warn({ errors: parsed.error.issues }, 'Invalid defile payload'); return; }

            const newZone: DefileZone = { id: uuidv4(), x: parsed.data.x, y: parsed.data.y, radius: parsed.data.radius };

            await updateCampaignJsonField<DefileZone>(campaignId, 'defileZones', (zones) => {
                zones.push(newZone);
                return zones;
            });

            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_DEFILE_PLACED, newZone);
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Defile error');
        }
    });

    socket.on(SocketEvents.CLIENT_REMOVE_DEFILE, async (data: RemoveDefilePayload) => {
        try {
            if (!isGM(socket)) { socket.emit(SocketEvents.SERVER_ERROR, { message: 'Only the GM can remove defile zones' }); return; }

            const parsed = RemoveDefileSchema.safeParse(data);
            if (!parsed.success) { logger.warn({ errors: parsed.error.issues }, 'Invalid remove defile payload'); return; }

            await updateCampaignJsonField<DefileZone>(campaignId, 'defileZones', (zones) =>
                zones.filter((z) => z.id !== parsed.data.id),
            );

            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_DEFILE_REMOVED, { id: parsed.data.id });
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Remove defile error');
        }
    });

    socket.on(SocketEvents.CLIENT_DEFILE_RESET, async () => {
        try {
            if (!isGM(socket)) { socket.emit(SocketEvents.SERVER_ERROR, { message: 'Only the GM can reset defile zones' }); return; }

            await updateCampaignJsonField(campaignId, 'defileZones', () => []);
            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_DEFILE_RESET);
        } catch (err) {
            logger.error({ err }, '[Socket:Map] Defile reset error');
        }
    });
}
