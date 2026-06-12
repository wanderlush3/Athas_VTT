// ─── Shared Type Definitions for Athas VTT ──────────────────────
// Pure interface / type-alias definitions. Enums remain in enums.ts.

import type { PsionicDiscipline, SpellSchool } from './enums';

// ─── Character Sub-Structures (for JSON columns) ─────────────────

export interface Skill {
    name: string;
    ranks: number;
    modifier: number;
    abilityMod: string; // 'STR' | 'DEX' | etc.
    classSkill: boolean;
    trainedOnly: boolean;
}

export interface Feat {
    name: string;
    description: string;
}

export interface PsionicPower {
    name: string;
    discipline: PsionicDiscipline;
    level: number;
    cost: number;
    description: string;
    augments?: string;
    display?: string; // auditory, visual, etc.
    range?: string;
    duration?: string;
    savingThrow?: string;
    powerResistance?: string;
    source?: string;         // 'learned' | 'wild-talent' | 'item'
    sourceItemId?: string;   // equipment id if source === 'item'
    sourceItemName?: string; // display name of source item
}

export interface GrantedPower {
    powerId: string | null;  // matches psionics.json id, or null for custom
    name: string;
    cost: number;            // PSP cost from character pool
    usesPerDay: number | null; // null = unlimited (just costs PSP)
    description: string;
}

export interface EquipmentItem {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'shield' | 'gear' | 'artifact' | 'other';
    damage?: string;
    armorBonus?: number;
    broken: boolean;
    breakageDC?: number | null; // null = unbreakable (metal). On nat-1, roll 1d20; if ≤ DC, item breaks.
    weight: number;
    notes: string;
    material?: string; // obsidian, bone, metal, wood, chitin
    grantedPowers?: GrantedPower[];
    source?: string;  // 'item' for item-granted powers tracking
    sourceItemId?: string;
}

// ─── Spell System (Cleric, Defiler, Preserver, Templar) ──────────

export interface Spell {
    name: string;
    level: number;
    school: string;
    prepared: boolean;
    castToday: number;
    description: string;
    range?: string;
    duration?: string;
    components?: string;
    savingThrow?: string;
    spellResistance?: string;
}

export interface SpellSlots {
    level: number;
    total: number;
    used: number;
}

// ─── Compendium Entry Interfaces ──────────────────────────────────
// These types describe the full reference data stored in the JSON compendium files.
// They are richer than the character-sheet types above (e.g., include `classes` for filtering).

export interface CompendiumPsionic {
    id: string;
    name: string;
    discipline: string;
    level: number;
    cost: number;
    display?: string;
    manifestingTime?: string;
    range?: string;
    target?: string;
    duration?: string;
    savingThrow?: string;
    powerResistance?: string;
    description: string;
    augments?: string;
    classes: string[];
    darkSunNotes?: string;
}

export interface CompendiumEquipment {
    id: string;
    name: string;
    type: 'weapon' | 'armor' | 'shield' | 'gear' | 'artifact' | 'other';
    subtype?: string;
    damage?: string | null;
    critical?: string | null;
    damageType?: string | null;
    armorBonus?: number | null;
    maxDexBonus?: number | null;
    armorCheckPenalty?: number | null;
    arcaneSpellFailure?: number | null;
    speed30?: number | null;
    speed20?: number | null;
    range?: string | null;
    weight: number;
    cost: string;
    material: string;
    breakageThreshold?: number | null;
    breakageNote?: string | null;
    proficiency?: string | null;
    description: string;
    properties: string[];
    darkSunNotes?: string;
    grantedPowers?: GrantedPower[];
}

export interface CompendiumSpell {
    id: string;
    name: string;
    level: number;
    school: string;
    subschool?: string | null;
    classes: string[];
    components?: string;
    castingTime?: string;
    range?: string;
    target?: string;
    duration?: string;
    savingThrow?: string;
    spellResistance?: string;
    description: string;
    defilingRadius?: number | null;
    domains?: string[];
    darkSunNotes?: string;
}

// ─── Feat Prerequisite Checking ───────────────────────────────────

export interface PrereqAbilityScore { ability: string; minimum: number; }
export interface PrereqSkillRank { skill: string; ranks: number; }
export interface PrereqClassLevel { className: string; level: number; }

export interface StructuredPrereqs {
    abilityScores?: PrereqAbilityScore[];
    feats?: string[];                    // required feat names
    bab?: number;                        // minimum base attack bonus
    classLevels?: PrereqClassLevel[];    // e.g., fighter level 8th
    characterLevel?: number;             // e.g., character level 6th
    casterLevel?: number;                // e.g., caster level 3rd
    skillRanks?: PrereqSkillRank[];      // e.g., Ride 1 rank
    special?: string[];                  // un-checkable notes (displayed as warnings)
}

export interface CompendiumFeat {
    id: string;
    name: string;
    type: string;
    prerequisites: string;
    structuredPrereqs?: StructuredPrereqs;
    benefit: string;
    description: string;
    special?: string;
    classes: string[];
    darkSunNotes?: string;
}

// ─── Race & Class Data (static reference) ────────────────────────

export interface RaceData {
    id: string;
    name: string;
    abilityAdjustments: Partial<Record<'strength'|'dexterity'|'constitution'|'intelligence'|'wisdom'|'charisma', number>>;
    speed: number;
    size: 'Small' | 'Medium' | 'Large';
    traits: string[];
    languages: string[];
    bonusLanguages: string[];
    favoredClass: string;
    darkSunNotes?: string;
    waterRequirement?: { active: number; rest: number }; // gallons/day
}

// ─── Survival (Dark Sun environmental tracking) ───────────────

export interface DehydrationStageDef {
    stage: number;
    name: string;
    icon: string;
    color: string;
    penalties: string | null;
}

export interface HeatSicknessStageDef {
    stage: number;
    name: string;
    icon: string;
    color: string;
    penalties: string | null;
    modifiers: ConditionModifiers | null;  // machine-readable for StatsTab
}

export interface TerrainHeatDef {
    id: string;
    name: string;
    checkIntervalHours: number;  // hours between CON checks
    icon: string;
}

export interface HeatRacialModDef {
    race: string;
    conBonus: number;            // bonus to CON save vs heat
    notes: string;
}

export interface ForcedMarchStageDef {
    stage: number;
    name: string;
    icon: string;
    color: string;
    penalties: string | null;
    modifiers: ConditionModifiers | null;
}

export interface TerrainMovementDef {
    id: string;          // reuses TERRAIN_HEAT_INTERVALS ids
    name: string;
    icon: string;
    multiplier: number;  // movement rate multiplier (1 = normal, 0.5 = half)
}

export interface NaturalHealingResult {
    hpPerDay: number;            // effective HP healed per full day of rest
    hpLongTermCare: number;      // effective HP with Heal DC 15 long-term care
    baseHpPerDay: number;        // unmodified rate (= character level)
    baseLongTermCare: number;    // unmodified long-term care (= 2 × level)
    isHalved: boolean;           // true if desert conditions reduce healing
    reasons: string[];           // why healing is halved (missing water/shade)
}

// ─── Condition Modifiers (D&D 3.5e) ──────────────────────────

/** Mechanical modifiers applied by a single condition */
export interface ConditionModifiers {
    str?: number;            // effective STR adjustment
    dex?: number;            // effective DEX adjustment
    attackRolls?: number;    // all attack rolls
    damage?: number;         // all damage rolls
    ac?: number;             // flat AC penalty (not from DEX loss)
    saves?: number;          // all saving throws
    skillChecks?: number;    // all skill checks
    abilityChecks?: number;  // all ability checks
    initiative?: number;     // initiative modifier
    speed?: 'half' | 'zero'; // speed reduction
    loseDexToAC?: boolean;   // lose DEX bonus to AC
    effectiveDex0?: boolean; // DEX treated as effectively 0
    effectiveStr0?: boolean; // STR treated as effectively 0
    cantAct?: boolean;       // cannot take actions
    notes?: string;          // rules reminder text
}

/** Aggregated penalties from all active conditions */
export interface ConditionPenaltySummary {
    str: number;
    dex: number;
    attackRolls: number;
    damage: number;
    ac: number;
    saves: number;
    skillChecks: number;
    abilityChecks: number;
    initiative: number;
    speed: 'half' | 'zero' | null;
    loseDexToAC: boolean;
    effectiveDex0: boolean;
    effectiveStr0: boolean;
    cantAct: boolean;
    sources: Record<string, string[]>; // modifier key → condition names
}

export interface ClassFeature {
    name: string;
    level: number;
    description: string;
    // For scaling features like Sneak Attack, Armor Optimization
    scaling?: { level: number; value: string }[];
}

export interface SpellProgressionTable {
    // spellsPerDay[classLevel-1][spellLevel] = slots  (null = not available)
    spellsPerDay: (number | null)[][];
    // For spontaneous casters (Templar): spellsKnown[classLevel-1][spellLevel]
    spellsKnown?: (number | null)[][];
    castingAbility: 'intelligence' | 'wisdom' | 'charisma';
    castingType: 'prepared' | 'spontaneous';
    maxSpellLevel: number;
}

export interface PsionicProgressionTable {
    // powerPointsPerDay[classLevel-1] = base PP
    powerPointsPerDay: number[];
    // powersKnown[classLevel-1] = total powers known
    powersKnown: number[];
    // maxPowerLevel[classLevel-1] = highest power level available
    maxPowerLevel: number[];
    keyAbility: 'intelligence';
}

export interface ClassData {
    id: string;
    name: string;
    hitDie: number;
    babProgression: 'full' | 'three_quarter' | 'half';
    goodSaves: ('fort' | 'ref' | 'will')[];
    skillPointsPerLevel: number;
    classSkills: string[];
    darkSunNotes?: string;
    // Level-up progression data
    classFeatures: ClassFeature[];
    bonusFeatLevels?: number[];
    bonusFeatType?: string;        // 'combat' | 'psionic' | 'metamagic_or_item_creation'
    spellProgression?: SpellProgressionTable;
    psionicProgression?: PsionicProgressionTable;
    proficiencies?: {
        weapons: string[];
        armor: string[];
        shields: string[];
    };
}

// ─── Level-Up History (for undo support) ──────────────────────────

export interface LevelUpRecord {
    timestamp: string;           // ISO date of when level-up was applied
    className: string;           // class leveled into
    newClassLevel: number;       // class level reached (e.g. Fighter 3)
    newTotalLevel: number;       // total character level reached
    hpGained: number;            // HP delta added this level
    skillPointsSpent: Record<string, number>;  // skill name → ranks added
    featGained: { name: string; description: string } | null;
    abilityBoost: string | null; // ability key boosted, e.g. 'strength'
    classFeatures: { name: string; level: number; description: string; className: string }[];
    // Derived stat snapshots (before level-up) for safe reversal
    prevStats: {
        hitPointsMax: number;
        hitPointsCurrent: number;
        baseAttackBonus: number;
        saveFort: number;
        saveRef: number;
        saveWill: number;
        pspMax: number;
        pspCurrent: number;
        spellSlots: SpellSlots[];
    };
}

// ─── Currency (Athas-specific) ────────────────────────────────────

export interface Currency {
    cp: number;   // Ceramic pieces — standard Athasian currency
    sp: number;   // Silver pieces — rare
    gp: number;   // Gold pieces — extremely rare
    bits: number; // Metal bits — scraps of precious metal
}

// ─── Session (deduplicated from client) ───────────────────────────

export interface SessionData {
    sessionToken: string;
    userId: string;
    username: string;
    role: 'GM' | 'PLAYER';
    campaignId: string;
    campaignName: string;
}

// ─── Types from gameConstants.ts ──────────────────────────────────

export type XpGroup = 'warrior' | 'ranger' | 'rogue' | 'priest' | 'defiler' | 'preserver' | 'psionicist';

export interface ConditionDef {
    id: string;
    name: string;
    icon: string;
    color: string;
    modifiers?: ConditionModifiers;
}

export interface ClassEntry {
    className: string;  // e.g. "Fighter", "Rogue"
    level: number;      // levels in this class
}

export interface ClassDataEntry {
    hitDie: number;
    babProgression: 'full' | 'three_quarter' | 'half';
    goodSaves: ('fort' | 'ref' | 'will')[];
    skillPointsPerLevel: number;
}

export interface PrereqCheckResult {
    met: boolean;
    details: { label: string; met: boolean }[];
    warnings: string[];
}

export interface CharacterPrereqData {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    feats: { name: string }[];
    baseAttackBonus: number;
    classLevels: ClassEntry[];
    level: number;
    skills: { name: string; ranks: number }[];
}

export interface SpellEligibility {
    eligible: boolean;
    reasons: string[];
}
