import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { logger } from '../logger';

/**
 * Simple session middleware.
 * Reads `x-session-token` header and attaches the user to `req.user`.
 * Rejects expired sessions.
 */
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: string;
        campaignId: string;
    };
}

export async function sessionMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const token = req.headers['x-session-token'] as string | undefined;

    if (!token) {
        res.status(401).json({ error: 'Missing session token' });
        return;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { sessionToken: token },
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid session token' });
            return;
        }

        if (user.expiresAt && user.expiresAt < new Date()) {
            res.status(401).json({ error: 'Session expired' });
            return;
        }

        req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            campaignId: user.campaignId,
        };

        next();
    } catch (err) {
        logger.error({ err }, '[Auth] Session validation error');
        res.status(500).json({ error: 'Internal server error' });
    }
}
