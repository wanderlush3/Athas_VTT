import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest, sessionMiddleware } from '../middleware/session';
import { ALLOWED_CHARACTER_FIELDS } from 'athas-shared';
import { logger } from '../logger';
import { CharacterCreateSchema, CharacterPatchSchema } from '../validation/schemas';
import { ZodError } from 'zod';

const router = Router();

/** Extract route param as string (Express named params are always strings). */
function paramId(req: AuthenticatedRequest): string {
    return req.params.id as string;
}

// All character routes require authentication
router.use(sessionMiddleware);

/**
 * Pick only whitelisted fields from a record.
 * Defense-in-depth alongside Zod validation.
 */
function pickAllowedFields(body: Record<string, unknown>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const key of ALLOWED_CHARACTER_FIELDS) {
        if (body[key] !== undefined) {
            data[key] = body[key];
        }
    }
    return data;
}

/**
 * GET /api/characters
 * Returns all characters for the authenticated user's campaign.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const characters = await prisma.character.findMany({
            where: { campaignId: req.user!.campaignId },
        });
        res.json(characters);
    } catch (err) {
        logger.error({ err }, '[Characters] List error');
        res.status(500).json({ error: 'Failed to fetch characters' });
    }
});

/**
 * GET /api/characters/:id
 * Returns a character — scoped to the user's campaign.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const character = await prisma.character.findFirst({
            where: {
                id: paramId(req),
                campaignId: req.user!.campaignId,
            },
        });

        if (!character) {
            res.status(404).json({ error: 'Character not found' });
            return;
        }

        res.json(character);
    } catch (err) {
        logger.error({ err }, '[Characters] Get error');
        res.status(500).json({ error: 'Failed to fetch character' });
    }
});

/**
 * POST /api/characters
 * Creates a character with whitelisted fields only.
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Enforce 3-character limit for players (GMs have no limit)
        if (req.user!.role !== 'GM') {
            const existingCount = await prisma.character.count({
                where: { userId: req.user!.id },
            });
            if (existingCount >= 3) {
                res.status(403).json({ error: 'Maximum 3 characters allowed for players' });
                return;
            }
        }

        const validated = CharacterCreateSchema.parse(req.body);
        const data = pickAllowedFields(validated);

        const character = await prisma.character.create({
            data: {
                ...data,
                name: (data.name as string) || 'Unnamed',
                race: (data.race as string) || 'Human',
                classLevel: (data.classLevel as string) || 'Fighter 1',
                userId: req.user!.id,
                campaignId: req.user!.campaignId,
            },
        });
        res.status(201).json(character);
    } catch (err) {
        if (err instanceof ZodError) {
            res.status(400).json({ error: 'Invalid input', details: err.issues });
            return;
        }
        logger.error({ err }, '[Characters] Create error');
        res.status(500).json({ error: 'Failed to create character' });
    }
});

/**
 * PATCH /api/characters/:id
 * Updates a character with whitelisted fields only.
 * Players can only update their own characters; GMs can update any in their campaign.
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Verify character exists in user's campaign
        const id = paramId(req);
        const existing = await prisma.character.findFirst({
            where: {
                id,
                campaignId: req.user!.campaignId,
            },
        });

        if (!existing) {
            res.status(404).json({ error: 'Character not found' });
            return;
        }

        // Players can only update their own characters
        if (req.user!.role !== 'GM' && existing.userId !== req.user!.id) {
            res.status(403).json({ error: 'You can only update your own characters' });
            return;
        }

        const validated = CharacterPatchSchema.parse(req.body);
        const data = pickAllowedFields(validated);

        const character = await prisma.character.update({
            where: { id },
            data,
        });
        res.json(character);
    } catch (err) {
        if (err instanceof ZodError) {
            res.status(400).json({ error: 'Invalid input', details: err.issues });
            return;
        }
        logger.error({ err }, '[Characters] Update error');
        res.status(500).json({ error: 'Failed to update character' });
    }
});

/**
 * DELETE /api/characters/:id
 * Deletes a character — only the owner or GM can delete.
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = paramId(req);
        const existing = await prisma.character.findFirst({
            where: {
                id,
                campaignId: req.user!.campaignId,
            },
        });

        if (!existing) {
            res.status(404).json({ error: 'Character not found' });
            return;
        }

        if (req.user!.role !== 'GM' && existing.userId !== req.user!.id) {
            res.status(403).json({ error: 'You can only delete your own characters' });
            return;
        }

        await prisma.character.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (err) {
        logger.error({ err }, '[Characters] Delete error');
        res.status(500).json({ error: 'Failed to delete character' });
    }
});

export default router;
