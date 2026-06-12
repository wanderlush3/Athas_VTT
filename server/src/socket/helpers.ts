import { prisma } from '../prisma/client';

/**
 * Fetch a campaign's JSON field, apply a mutator, save the result, and return the new value.
 * Uses an interactive transaction to prevent race conditions — concurrent calls are serialized
 * so that two simultaneous token moves (or fog reveals, etc.) don't overwrite each other.
 */
export async function updateCampaignJsonField<T>(
    campaignId: string,
    field: 'tokenState' | 'fogMask' | 'defileZones',
    mutator: (current: T[]) => T[],
): Promise<T[]> {
    return prisma.$transaction(async (tx) => {
        const campaign = await tx.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);

        const current: T[] = JSON.parse((campaign[field] as string) || '[]');
        const updated = mutator(current);

        await tx.campaign.update({
            where: { id: campaignId },
            data: { [field]: JSON.stringify(updated) },
        });

        return updated;
    });
}
