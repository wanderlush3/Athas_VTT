import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { logger } from '../logger';
import { JoinSchema } from '../validation/schemas';
import { ZodError } from 'zod';

const router = Router();

const SESSION_DURATION_MS = 21 * 24 * 60 * 60 * 1000; // 21 days
const BCRYPT_ROUNDS = 12;

/**
 * POST /api/auth/join
 * Body: { campaignName, password, username, role? }
 *
 * Joins an existing campaign or creates one if it doesn't exist.
 * Returns a session token for Socket.io auth.
 */
router.post('/join', async (req: Request, res: Response): Promise<void> => {
    try {
        const { campaignName, password, username, role } = JoinSchema.parse(req.body);

        // Find or create campaign
        let campaign = await prisma.campaign.findFirst({
            where: { name: campaignName },
        });

        if (campaign) {
            // Verify password
            const valid = await bcrypt.compare(password, campaign.password);
            if (!valid) {
                res.status(403).json({ error: 'Incorrect campaign password' });
                return;
            }
        } else {
            // First user creates the campaign (becomes GM)
            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
            campaign = await prisma.campaign.create({
                data: {
                    name: campaignName,
                    password: hashedPassword,
                },
            });
        }

        // Check if user already exists in this campaign
        const existingUser = await prisma.user.findUnique({
            where: {
                username_campaignId: {
                    username,
                    campaignId: campaign.id,
                },
            },
        });

        if (existingUser) {
            // Refresh session expiry on re-login
            const refreshed = await prisma.user.update({
                where: { id: existingUser.id },
                data: { expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
            });

            res.json({
                sessionToken: refreshed.sessionToken,
                userId: refreshed.id,
                username: refreshed.username,
                role: refreshed.role,
                campaignId: campaign.id,
                campaignName: campaign.name,
            });
            return;
        }

        // Create new user session
        const sessionToken = uuidv4();
        const userRole = role === 'GM' ? 'GM' : 'PLAYER';

        const user = await prisma.user.create({
            data: {
                username,
                role: userRole,
                sessionToken,
                campaignId: campaign.id,
                expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
            },
        });

        res.status(201).json({
            sessionToken: user.sessionToken,
            userId: user.id,
            username: user.username,
            role: user.role,
            campaignId: campaign.id,
            campaignName: campaign.name,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            res.status(400).json({ error: 'Invalid input', details: err.issues });
            return;
        }
        logger.error({ err }, '[Auth] Join error');
        res.status(500).json({ error: 'Failed to join campaign' });
    }
});

export default router;
