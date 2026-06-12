import { Server, Socket } from 'socket.io';
import {
    SocketEvents,
    SocketData,
    ClientToServerEvents,
    ServerToClientEvents,
    DiceRollPayload,
    ChatMessagePayload,
} from 'athas-shared';
import { prisma } from '../prisma/client';
import { logger } from '../logger';
import { DiceRollSchema, ChatMessageSchema } from '../validation/schemas';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/**
 * Chat & Dice Socket Events
 * Handles dice rolling and chat messages, persisting to the ChatMessage model.
 */
export function registerChatEvents(io: TypedServer, socket: TypedSocket, campaignId: string, userId: string, username: string) {
    // ── Dice Roll ───────────────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_ROLL_DICE, async (data: DiceRollPayload) => {
        try {
            const parsed = DiceRollSchema.safeParse(data);
            if (!parsed.success) { logger.warn({ errors: parsed.error.issues }, 'Invalid dice roll payload'); return; }

            // Roll each die
            const results: number[] = [];
            const formulaParts: string[] = [];

            for (const die of parsed.data.dice) {
                const sides = parseInt(die.type.replace('d', ''), 10);
                for (let i = 0; i < die.count; i++) {
                    const roll = Math.floor(Math.random() * sides) + 1;
                    results.push(roll);
                }
                formulaParts.push(`${die.count}${die.type}`);
            }

            let total = results.reduce((sum, r) => sum + r, 0);
            let formula = formulaParts.join(' + ');

            if (parsed.data.modifier) {
                total += parsed.data.modifier;
                formula += parsed.data.modifier < 0
                    ? ` - ${Math.abs(parsed.data.modifier)}`
                    : ` + ${parsed.data.modifier}`;
            }

            // Build display content
            const label = parsed.data.label ? ` (${parsed.data.label})` : '';
            const content = `🎲 ${username} rolled ${formula}${label}: [${results.join(', ')}] = **${total}**`;

            // Persist to chat log
            await prisma.chatMessage.create({
                data: {
                    type: 'ROLL',
                    userId,
                    username,
                    content,
                    rollData: JSON.stringify({ dice: parsed.data.dice, results, total, formula }),
                    campaignId,
                },
            });

            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_DICE_RESULT, {
                userId,
                username,
                dice: parsed.data.dice,
                results,
                total,
                formula,
                label: parsed.data.label,
            });
        } catch (err) {
            logger.error({ err }, '[Socket:Chat] Dice roll error');
        }
    });

    // ── Chat Message ────────────────────────────────────────────────
    socket.on(SocketEvents.CLIENT_CHAT_MESSAGE, async (data: ChatMessagePayload) => {
        try {
            const parsed = ChatMessageSchema.safeParse(data);
            if (!parsed.success) return; // Silently ignore empty/invalid messages

            const message = await prisma.chatMessage.create({
                data: {
                    type: 'CHAT',
                    userId,
                    username,
                    content: parsed.data.content.trim(),
                    campaignId,
                },
            });

            io.to(`campaign:${campaignId}`).emit(SocketEvents.SERVER_CHAT_MESSAGE, {
                id: message.id,
                userId,
                username,
                content: message.content,
                timestamp: message.createdAt.toISOString(),
            });
        } catch (err) {
            logger.error({ err }, '[Socket:Chat] Message error');
        }
    });
}
