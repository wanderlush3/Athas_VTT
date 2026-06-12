import { z } from 'zod';
import { ALLOWED_CHARACTER_FIELDS } from 'athas-shared';

// ── Auth ─────────────────────────────────────────────────────────

export const JoinSchema = z.object({
    campaignName: z.string().min(1).max(100),
    password: z.string().min(1).max(100),
    username: z.string().min(1).max(50),
    role: z.enum(['GM', 'PLAYER']).optional(),
});

// ── Socket: Join Campaign ────────────────────────────────────────

export const JoinCampaignSchema = z.object({
    sessionToken: z.string().min(1),
    campaignId: z.string().min(1),
});

// ── Campaign ─────────────────────────────────────────────────────

export const CampaignPatchSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    mapImageUrl: z.string().max(500).optional(),
}).strict();

// ── Character ────────────────────────────────────────────────────

// Integer fields on the Character model
const INT_FIELDS = new Set([
    'level', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
    'hitPointsMax', 'hitPointsCurrent', 'armorClass', 'baseAttackBonus', 'initiative', 'speed',
    'saveFort', 'saveRef', 'saveWill', 'pspMax', 'pspCurrent',
    'currencyCp', 'currencySp', 'currencyGp', 'currencyBits', 'experiencePoints',
    'acArmor', 'acShield', 'acNatural', 'acDeflection', 'acMisc', 'acSizeMod',
    'dehydrationStage', 'heatSicknessStage', 'forcedMarchStage',
]);

// Float fields on the Character model
const FLOAT_FIELDS = new Set([
    'waterSupply', 'heatExposureHours', 'marchHoursToday',
]);

// String fields on the Character model (including JSON-serialized arrays)
const STRING_FIELDS = new Set([
    'name', 'race', 'classLevel', 'alignment',
    'skills', 'feats', 'powers', 'equipment', 'spells', 'spellSlots',
    'gender', 'age', 'height', 'weight', 'deity', 'appearance', 'personality',
    'conditions', 'classLevels', 'classFeatures', 'levelHistory', 'notes',
]);

/** Validate and coerce character field values to correct types. */
function validateCharacterFields(body: Record<string, unknown>): Record<string, unknown> {
    const validated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
        if (INT_FIELDS.has(key)) {
            if (typeof value !== 'number' || !Number.isFinite(value)) continue;
            validated[key] = Math.trunc(value);
        } else if (FLOAT_FIELDS.has(key)) {
            if (typeof value !== 'number' || !Number.isFinite(value)) continue;
            validated[key] = value;
        } else if (STRING_FIELDS.has(key)) {
            if (typeof value !== 'string') continue;
            validated[key] = value;
        }
        // Unknown fields are silently dropped (pickAllowedFields handles this too)
    }
    return validated;
}

export const CharacterCreateSchema = z.record(z.string(), z.unknown()).transform(validateCharacterFields);
export const CharacterPatchSchema = z.record(z.string(), z.unknown()).transform(validateCharacterFields);

// ── Socket: Sheet Events ─────────────────────────────────────────

export const SheetUpdateSchema = z.object({
    characterId: z.string().min(1),
    field: z.enum(ALLOWED_CHARACTER_FIELDS as unknown as [string, ...string[]]),
    value: z.union([z.string(), z.number(), z.boolean()]),
});

export const UsePowerSchema = z.object({
    characterId: z.string().min(1),
    powerIndex: z.number().int().min(0),
    cost: z.number().int().min(0),
});

// ── Socket: Map Events ───────────────────────────────────────────

export const MoveTokenSchema = z.object({
    tokenId: z.string().min(1),
    x: z.number(),
    y: z.number(),
});

export const AddTokenSchema = z.object({
    imageUrl: z.string().min(1),
    x: z.number(),
    y: z.number(),
    label: z.string(),
    size: z.number().int().min(1),
});

export const RemoveTokenSchema = z.object({
    tokenId: z.string().min(1),
});

export const FogRevealSchema = z.object({
    points: z.array(z.object({ x: z.number(), y: z.number() })).max(10000),
    brushSize: z.number().int().min(1),
});

export const DefileSchema = z.object({
    x: z.number(),
    y: z.number(),
    radius: z.number().min(1),
});

export const RemoveDefileSchema = z.object({
    id: z.string().min(1),
});

// ── Socket: Chat Events ──────────────────────────────────────────

export const ChatMessageSchema = z.object({
    content: z.string().min(1).max(2000),
});

const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const;

export const DiceRollSchema = z.object({
    dice: z.array(z.object({
        type: z.enum(DIE_TYPES),
        count: z.number().int().min(1).max(100),
    })).min(1),
    modifier: z.number().int().optional(),
    label: z.string().max(100).optional(),
});
