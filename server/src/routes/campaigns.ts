import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest, sessionMiddleware } from '../middleware/session';
import { logger } from '../logger';
import { CampaignPatchSchema } from '../validation/schemas';
import { ZodError } from 'zod';

const router = Router();

router.use(sessionMiddleware);

/**
 * GET /api/campaigns
 * Returns campaigns the user belongs to.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const campaigns = await prisma.campaign.findMany({
            where: {
                users: { some: { id: req.user!.id } },
            },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { users: true, characters: true } },
            },
        });
        res.json(campaigns);
    } catch (err) {
        logger.error({ err }, '[Campaigns] List error');
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

/**
 * GET /api/campaigns/:id
 * Returns campaign details — only if the user belongs to this campaign.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Users can only view their own campaign
        if (req.params.id !== req.user!.campaignId) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }

        const campaign = await prisma.campaign.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                name: true,
                mapImageUrl: true,
                fogMask: true,
                defileZones: true,
                tokenState: true,
                createdAt: true,
                updatedAt: true,
                users: { select: { id: true, username: true, role: true } },
            },
        });

        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }

        res.json(campaign);
    } catch (err) {
        logger.error({ err }, '[Campaigns] Get error');
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});

/**
 * PATCH /api/campaigns/:id (GM only)
 * Allowed fields: name, mapImageUrl
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user!.role !== 'GM') {
            res.status(403).json({ error: 'Only the GM can update campaign settings' });
            return;
        }

        if (req.params.id !== req.user!.campaignId) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }

        const { name, mapImageUrl } = CampaignPatchSchema.parse(req.body);
        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (mapImageUrl !== undefined) data.mapImageUrl = mapImageUrl;

        const campaign = await prisma.campaign.update({
            where: { id: req.params.id },
            data,
            select: {
                id: true,
                name: true,
                mapImageUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json(campaign);
    } catch (err) {
        if (err instanceof ZodError) {
            res.status(400).json({ error: 'Invalid input', details: err.issues });
            return;
        }
        logger.error({ err }, '[Campaigns] Update error');
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});

export default router;
