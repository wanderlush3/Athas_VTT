import { Server, Socket } from 'socket.io';
import {
    SocketEvents,
    SocketData,
    ClientToServerEvents,
    ServerToClientEvents,
    UpdateSheetPayload,
    UsePowerPayload,
    ALLOWED_CHARACTER_FIELDS,
} from 'athas-shared';
import { prisma } from '../prisma/client';
import { canEditCharacter } from './guards';
import { logger } from '../logger';
import { SheetUpdateSchema, UsePowerSchema } from '../validation/schemas';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/**
 * Character Sheet Socket Events
 * Handles real-time sheet updates and psionic power usage.
 */
export function registerSheetEvents(io: TypedServer, socket: TypedSocket, campaignId: string, userId: string, username: string) {
    // ── Sheet Field Update ──────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_UPDATE_SHEET, async (data: UpdateSheetPayload) => {
        try {
            const parsed = SheetUpdateSchema.safeParse(data);
            if (!parsed.success) {
                logger.warn({ errors: parsed.error.issues }, 'Invalid sheet update payload');
                return;
            }

            if (!(await canEditCharacter(socket, parsed.data.characterId))) {
                socket.emit(SocketEvents.SERVER_ERROR, { message: 'You can only edit your own character sheet' });
                return;
            }

            await prisma.character.update({
                where: { id: parsed.data.characterId },
                data: { [parsed.data.field]: parsed.data.value },
            });

            // Broadcast to all in campaign (including GM)
            socket.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_SHEET_UPDATED, {
                characterId: parsed.data.characterId,
                field: parsed.data.field,
                value: parsed.data.value,
                updatedBy: userId,
            });
        } catch (err) {
            logger.error({ err }, '[Socket:Sheet] Update error');
        }
    });

    // ── Use Psionic Power ───────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_USE_POWER, async (data: UsePowerPayload) => {
        try {
            const parsed = UsePowerSchema.safeParse(data);
            if (!parsed.success) {
                logger.warn({ errors: parsed.error.issues }, 'Invalid use power payload');
                return;
            }

            if (!(await canEditCharacter(socket, parsed.data.characterId))) {
                socket.emit(SocketEvents.SERVER_ERROR, { message: 'You can only use powers from your own character' });
                return;
            }

            const character = await prisma.character.findUnique({
                where: { id: parsed.data.characterId },
            });

            if (!character) return;

            // Check sufficient PSP
            if (character.pspCurrent < parsed.data.cost) {
                socket.emit(SocketEvents.SERVER_ERROR, { message: 'Insufficient Power Points' });
                return;
            }

            // Deduct PSP
            const newPsp = character.pspCurrent - parsed.data.cost;
            await prisma.character.update({
                where: { id: parsed.data.characterId },
                data: { pspCurrent: newPsp },
            });

            // Get power name from JSON array
            const powers = JSON.parse(character.powers || '[]');
            const power = powers[parsed.data.powerIndex];
            const powerName = power?.name || `Power #${parsed.data.powerIndex}`;

            // Broadcast power usage
            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_POWER_USED, {
                characterId: parsed.data.characterId,
                powerName,
                cost: parsed.data.cost,
                newPsp,
            });

            // Log to chat
            const content = `🔮 ${username}'s ${character.name} manifests **${powerName}** (−${parsed.data.cost} PSP, ${newPsp}/${character.pspMax} remaining)`;
            const message = await prisma.chatMessage.create({
                data: {
                    type: 'SYSTEM',
                    userId,
                    username,
                    content,
                    campaignId,
                },
            });

            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_CHAT_MESSAGE, {
                id: message.id,
                userId,
                username,
                content,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            logger.error({ err }, '[Socket:Sheet] Use power error');
        }
    });
}
