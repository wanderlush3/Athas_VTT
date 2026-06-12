import { Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from 'athas-shared';
import { prisma } from '../prisma/client';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/**
 * Check if the socket user has GM role.
 */
export function isGM(socket: TypedSocket): boolean {
    return socket.data.role === 'GM';
}

/**
 * Check if the socket user owns the character OR is GM.
 * Returns true if authorized.
 */
export async function canEditCharacter(socket: TypedSocket, characterId: string): Promise<boolean> {
    if (isGM(socket)) return true;

    const userId = socket.data.userId;
    if (!userId) return false;

    const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: { userId: true },
    });

    return character?.userId === userId;
}
