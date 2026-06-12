import { Server, Socket } from 'socket.io';
import {
    SocketEvents,
    SocketData,
    ClientToServerEvents,
    ServerToClientEvents,
    JoinCampaignPayload,
} from 'athas-shared';
import { prisma } from '../prisma/client';
import { JoinCampaignSchema } from '../validation/schemas';
import { logger } from '../logger';
import { registerMapEvents } from './mapEvents';
import { registerChatEvents } from './chatEvents';
import { registerSheetEvents } from './sheetEvents';

interface ExtendedSocketData extends SocketData {
    handlersRegistered?: boolean;
}

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, {}, ExtendedSocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, ExtendedSocketData>;

/**
 * Register all Socket.io event handlers.
 * Each connection authenticates via session token, joins a campaign room,
 * then gets all domain-specific event handlers registered.
 */
export function initializeSocket(io: TypedServer) {
    io.on('connection', (socket: TypedSocket) => {
        logger.debug({ socketId: socket.id }, 'Socket connected');

        // ── Join Campaign ───────────────────────────────────────────
        socket.on(SocketEvents.CLIENT_JOIN_CAMPAIGN, async (data: JoinCampaignPayload) => {
            try {
                const parsed = JoinCampaignSchema.safeParse(data);
                if (!parsed.success) {
                    logger.warn({ errors: parsed.error.issues }, 'Invalid join campaign payload');
                    socket.emit(SocketEvents.SERVER_ERROR, { message: 'Invalid join payload' });
                    socket.disconnect();
                    return;
                }
                const { sessionToken, campaignId } = parsed.data;

                // Validate session
                const user = await prisma.user.findUnique({
                    where: { sessionToken },
                });

                if (!user || user.campaignId !== campaignId) {
                    socket.emit(SocketEvents.SERVER_ERROR, { message: 'Invalid session or campaign' });
                    socket.disconnect();
                    return;
                }

                // Check session expiry
                if (user.expiresAt && user.expiresAt < new Date()) {
                    logger.warn({ userId: user.id, username: user.username }, 'Expired session attempted socket connection');
                    socket.emit(SocketEvents.SERVER_ERROR, { message: 'Session expired' });
                    socket.disconnect();
                    return;
                }

                // Join the campaign room
                socket.join(`campaign:${campaignId}`);
                logger.info({ username: user.username, role: user.role, campaignId }, 'User joined campaign');

                // Store user info on the socket for later use
                socket.data.userId = user.id;
                socket.data.username = user.username;
                socket.data.role = user.role as SocketData['role'];
                socket.data.campaignId = campaignId;

                // Send full campaign state to the joining client
                const campaign = await prisma.campaign.findUnique({
                    where: { id: campaignId },
                    include: {
                        users: { select: { id: true, username: true, role: true } },
                    },
                });

                if (campaign) {
                    socket.emit(SocketEvents.SERVER_CAMPAIGN_STATE, {
                        campaignId: campaign.id,
                        mapImageUrl: campaign.mapImageUrl,
                        fogMask: campaign.fogMask || '[]',
                        defileZones: JSON.parse(campaign.defileZones || '[]'),
                        tokens: JSON.parse(campaign.tokenState || '[]'),
                        users: campaign.users.map(u => ({
                            id: u.id,
                            username: u.username,
                            role: u.role as SocketData['role'],
                        })),
                    });
                }

                // Notify others that a user joined
                socket.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_USER_JOINED, {
                    userId: user.id,
                    username: user.username,
                    role: user.role as SocketData['role'],
                });

                // Register domain-specific event handlers (only once per socket)
                if (!socket.data.handlersRegistered) {
                    registerMapEvents(io, socket, campaignId, user.id);
                    registerChatEvents(io, socket, campaignId, user.id, user.username);
                    registerSheetEvents(io, socket, campaignId, user.id, user.username);
                    socket.data.handlersRegistered = true;
                }

            } catch (err) {
                logger.error({ err }, 'Socket join campaign error');
                socket.emit(SocketEvents.SERVER_ERROR, { message: 'Failed to join campaign' });
            }
        });

        // ── Disconnect ──────────────────────────────────────────────
        socket.on('disconnect', () => {
            const campaignId = socket.data.campaignId;
            const username = socket.data.username;
            const userId = socket.data.userId;

            if (campaignId) {
                socket.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_USER_LEFT, {
                    userId: userId || socket.id,
                    username: username || 'Unknown',
                });
                logger.info({ username: username || socket.id, campaignId }, 'User left campaign');
            } else {
                logger.debug({ socketId: socket.id }, 'Socket disconnected (no campaign)');
            }
        });
    });
}
