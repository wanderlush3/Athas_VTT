// ─── Dark Sun Class-Specific XP Tables (AD&D 2e) ──────────────────
// Each class group has its own progression. Defilers advance faster than Preservers.

import type {
    ClassData, ClassFeature, StructuredPrereqs,
    XpGroup, ConditionDef, ClassEntry, ClassDataEntry,
    PrereqCheckResult, CharacterPrereqData, SpellEligibility,
    DehydrationStageDef, ConditionModifiers, ConditionPenaltySummary,
    HeatSicknessStageDef, TerrainHeatDef, HeatRacialModDef,
    ForcedMarchStageDef, TerrainMovementDef, NaturalHealingResult,
} from './types';

// Re-export types that were previously defined in this file
export type { XpGroup, ConditionDef, ClassEntry, ClassDataEntry, PrereqCheckResult, CharacterPrereqData, SpellEligibility, DehydrationStageDef, ConditionModifiers, ConditionPenaltySummary, HeatSicknessStageDef, TerrainHeatDef, HeatRacialModDef, NaturalHealingResult };


// Maps Dark Sun class names to their XP group
export const CLASS_XP_GROUP: Record<string, XpGroup> = {
    'Fighter': 'warrior',
    'Gladiator': 'warrior',
    'Ranger': 'ranger',
    'Rogue': 'rogue',
    'Bard': 'rogue',
    'Cleric': 'priest',
    'Druid': 'priest',
    'Templar': 'priest',
    'Defiler': 'defiler',
    'Preserver': 'preserver',
    'Psionicist': 'psionicist',
};

// XP required to reach each level (index 0 = level 1, index 1 = level 2, etc.)
// All tables go to level 20.
export const XP_TABLES: Record<XpGroup, number[]> = {
    warrior: [
        0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000,
        750000, 1000000, 1250000, 1500000, 1750000, 2000000, 2250000, 2500000, 2750000, 3000000,
    ],
    ranger: [
        0, 2250, 4500, 9000, 18000, 36000, 75000, 150000, 300000, 600000,
        900000, 1200000, 1500000, 1800000, 2100000, 2400000, 2700000, 3000000, 3300000, 3600000,
    ],
    rogue: [
        0, 1250, 2500, 5000, 10000, 20000, 42500, 70000, 110000, 160000,
        220000, 440000, 660000, 880000, 1100000, 1320000, 1540000, 1760000, 1980000, 2200000,
    ],
    priest: [
        0, 1500, 3000, 6000, 13000, 27500, 55000, 110000, 225000, 450000,
        675000, 900000, 1125000, 1350000, 1575000, 1800000, 2025000, 2250000, 2475000, 2700000,
    ],
    defiler: [
        0, 1750, 3500, 7000, 14000, 28000, 42000, 63000, 94500, 180000,
        270000, 540000, 820000, 1080000, 1350000, 1620000, 1890000, 2160000, 2430000, 2700000,
    ],
    preserver: [
        0, 2500, 5000, 10000, 20000, 40000, 60000, 90000, 135000, 250000,
        375000, 750000, 1125000, 1500000, 1875000, 2250000, 2625000, 3000000, 3375000, 3750000,
    ],
    psionicist: [
        0, 2200, 4400, 8800, 16500, 30000, 55000, 100000, 200000, 400000,
        600000, 800000, 1000000, 1200000, 1500000, 1800000, 2100000, 2400000, 2700000, 3000000,
    ],
};

/** Get the XP required to reach a given level for a given class */
export function xpForLevel(className: string, level: number): number {
    const group = CLASS_XP_GROUP[className] || 'warrior';
    const table = XP_TABLES[group];
    if (level < 1) return 0;
    if (level > 20) return table[19]; // Cap at 20
    return table[level - 1];
}

/** Get XP progress toward next level */
export function xpToNextLevel(className: string, level: number, currentXP: number): { needed: number; progress: number } {
    const currentThreshold = xpForLevel(className, level);
    const nextThreshold = xpForLevel(className, level + 1);
    const needed = nextThreshold - currentXP;
    const range = nextThreshold - currentThreshold;
    const progress = range > 0 ? Math.min(1, Math.max(0, (currentXP - currentThreshold) / range)) : 1;
    return { needed: Math.max(0, needed), progress };
}

// ─── Carrying Capacity (D&D 3.5e Table 9-1) ──────────────────────
// Maps STR score to load limits in pounds.

interface CarryCapacity {
    light: number;
    medium: number;
    heavy: number;
}

const CARRY_TABLE: Record<number, CarryCapacity> = {
    1: { light: 3, medium: 6, heavy: 10 },
    2: { light: 6, medium: 13, heavy: 20 },
    3: { light: 10, medium: 20, heavy: 30 },
    4: { light: 13, medium: 26, heavy: 40 },
    5: { light: 16, medium: 33, heavy: 50 },
    6: { light: 20, medium: 40, heavy: 60 },
    7: { light: 23, medium: 46, heavy: 70 },
    8: { light: 26, medium: 53, heavy: 80 },
    9: { light: 30, medium: 60, heavy: 90 },
    10: { light: 33, medium: 66, heavy: 100 },
    11: { light: 38, medium: 76, heavy: 115 },
    12: { light: 43, medium: 86, heavy: 130 },
    13: { light: 50, medium: 100, heavy: 150 },
    14: { light: 58, medium: 116, heavy: 175 },
    15: { light: 66, medium: 133, heavy: 200 },
    16: { light: 76, medium: 153, heavy: 230 },
    17: { light: 86, medium: 173, heavy: 260 },
    18: { light: 100, medium: 200, heavy: 300 },
    19: { light: 116, medium: 233, heavy: 350 },
    20: { light: 133, medium: 266, heavy: 400 },
    21: { light: 153, medium: 306, heavy: 460 },
    22: { light: 173, medium: 346, heavy: 520 },
    23: { light: 200, medium: 400, heavy: 600 },
    24: { light: 233, medium: 466, heavy: 700 },
    25: { light: 266, medium: 533, heavy: 800 },
    26: { light: 306, medium: 613, heavy: 920 },
    27: { light: 346, medium: 693, heavy: 1040 },
    28: { light: 400, medium: 800, heavy: 1200 },
    29: { light: 466, medium: 933, heavy: 1400 },
    30: { light: 532, medium: 1064, heavy: 1600 },
};

/** Get carry capacity limits for a given STR score */
export function getCarryCapacity(str: number): CarryCapacity {
    if (str <= 0) return { light: 0, medium: 0, heavy: 0 };
    if (str > 30) return CARRY_TABLE[30];
    return CARRY_TABLE[str] || CARRY_TABLE[10];
}

/** Determine load category from STR and total weight */
export function getLoadCategory(str: number, totalWeight: number): 'light' | 'medium' | 'heavy' | 'overloaded' {
    const cap = getCarryCapacity(str);
    if (totalWeight <= cap.light) return 'light';
    if (totalWeight <= cap.medium) return 'medium';
    if (totalWeight <= cap.heavy) return 'heavy';
    return 'overloaded';
}

// ─── Size Modifiers (D&D 3.5e) ────────────────────────────────────
// AC & Attack size modifiers (smaller = bonus, larger = penalty)
export const SIZE_AC_MOD: Record<string, number> = {
    'Fine': 8, 'Diminutive': 4, 'Tiny': 2, 'Small': 1,
    'Medium': 0, 'Large': -1, 'Huge': -2, 'Gargantuan': -4, 'Colossal': -8,
};

// Grapple size modifiers (larger = bonus)
export const SIZE_GRAPPLE_MOD: Record<string, number> = {
    'Fine': -16, 'Diminutive': -12, 'Tiny': -8, 'Small': -4,
    'Medium': 0, 'Large': 4, 'Huge': 8, 'Gargantuan': 12, 'Colossal': 16,
};

/** Get AC/attack size modifier */
export function getSizeModAC(size: string): number {
    return SIZE_AC_MOD[size] ?? 0;
}

/** Get grapple size modifier */
export function getSizeModGrapple(size: string): number {
    return SIZE_GRAPPLE_MOD[size] ?? 0;
}

// ─── Conditions (D&D 3.5e) ────────────────────────────────────────
// ConditionDef type imported from ./types

export const CONDITIONS_3_5E: ConditionDef[] = [
    { id: 'blinded', name: 'Blinded', icon: '🙈', color: 'gray', modifiers: {
        ac: -2, attackRolls: -4, loseDexToAC: true,
        notes: 'All opponents have total concealment. Half speed.',
    }},
    { id: 'confused', name: 'Confused', icon: '😵', color: 'purple', modifiers: {
        cantAct: true, notes: 'Acts randomly each round.',
    }},
    { id: 'dazed', name: 'Dazed', icon: '💫', color: 'yellow', modifiers: {
        cantAct: true, notes: 'Can take no actions.',
    }},
    { id: 'dazzled', name: 'Dazzled', icon: '✨', color: 'amber', modifiers: {
        attackRolls: -1,
    }},
    { id: 'deafened', name: 'Deafened', icon: '🔇', color: 'gray', modifiers: {
        initiative: -4, notes: 'Auto-fail Listen checks. 20% spell failure (verbal).',
    }},
    { id: 'entangled', name: 'Entangled', icon: '🕸️', color: 'green', modifiers: {
        dex: -4, attackRolls: -2, speed: 'half',
    }},
    { id: 'exhausted', name: 'Exhausted', icon: '😩', color: 'orange', modifiers: {
        str: -6, dex: -6, speed: 'half', notes: 'Cannot run or charge.',
    }},
    { id: 'fatigued', name: 'Fatigued', icon: '😴', color: 'yellow', modifiers: {
        str: -2, dex: -2, notes: 'Cannot run or charge.',
    }},
    { id: 'frightened', name: 'Frightened', icon: '😨', color: 'indigo', modifiers: {
        attackRolls: -2, saves: -2, skillChecks: -2, abilityChecks: -2,
        notes: 'Must flee from source of fear.',
    }},
    { id: 'grappling', name: 'Grappling', icon: '🤼', color: 'red', modifiers: {
        loseDexToAC: true, notes: 'Lose DEX bonus to AC against non-grapple attackers.',
    }},
    { id: 'helpless', name: 'Helpless', icon: '🆘', color: 'red', modifiers: {
        effectiveDex0: true, notes: 'Melee attackers get +4 to hit. Vulnerable to coup de grace.',
    }},
    { id: 'invisible', name: 'Invisible', icon: '👻', color: 'sky', modifiers: {
        attackRolls: 2, notes: '+2 attack. Opponents have 50% miss chance (total concealment).',
    }},
    { id: 'nauseated', name: 'Nauseated', icon: '🤢', color: 'green', modifiers: {
        cantAct: true, notes: 'Can take only a single move action per turn.',
    }},
    { id: 'paralyzed', name: 'Paralyzed', icon: '⚡', color: 'yellow', modifiers: {
        effectiveDex0: true, effectiveStr0: true, cantAct: true,
        notes: 'Helpless. Cannot move or act.',
    }},
    { id: 'petrified', name: 'Petrified', icon: '🪨', color: 'stone', modifiers: {
        effectiveDex0: true, cantAct: true, notes: 'Turned to stone. Unconscious.',
    }},
    { id: 'prone', name: 'Prone', icon: '⬇️', color: 'amber', modifiers: {
        attackRolls: -4, notes: 'Melee -4 attack. +4 AC vs ranged, -4 AC vs melee.',
    }},
    { id: 'shaken', name: 'Shaken', icon: '😰', color: 'violet', modifiers: {
        attackRolls: -2, saves: -2, skillChecks: -2, abilityChecks: -2,
    }},
    { id: 'sickened', name: 'Sickened', icon: '🤮', color: 'lime', modifiers: {
        attackRolls: -2, damage: -2, saves: -2, skillChecks: -2, abilityChecks: -2,
    }},
    { id: 'stunned', name: 'Stunned', icon: '⭐', color: 'yellow', modifiers: {
        ac: -2, loseDexToAC: true, cantAct: true,
        notes: 'Drops held items.',
    }},
    { id: 'unconscious', name: 'Unconscious', icon: '💀', color: 'red', modifiers: {
        effectiveDex0: true, cantAct: true, notes: 'Helpless.',
    }},
];

// ── Condition Penalty Aggregation ─────────────────────────────

const CONDITION_MAP = new Map(CONDITIONS_3_5E.map(c => [c.id, c]));

const NUMERIC_MOD_KEYS: (keyof ConditionModifiers & string)[] = [
    'str', 'dex', 'attackRolls', 'damage', 'ac',
    'saves', 'skillChecks', 'abilityChecks', 'initiative',
];

/** Aggregate modifiers from all active conditions into a single summary */
export function getConditionPenalties(activeConditions: string[]): ConditionPenaltySummary {
    const summary: ConditionPenaltySummary = {
        str: 0, dex: 0, attackRolls: 0, damage: 0, ac: 0,
        saves: 0, skillChecks: 0, abilityChecks: 0, initiative: 0,
        speed: null, loseDexToAC: false, effectiveDex0: false,
        effectiveStr0: false, cantAct: false, sources: {},
    };

    for (const condId of activeConditions) {
        const cond = CONDITION_MAP.get(condId);
        if (!cond?.modifiers) continue;
        const mods = cond.modifiers;

        // Sum numeric modifiers
        for (const key of NUMERIC_MOD_KEYS) {
            const val = mods[key];
            if (typeof val === 'number') {
                (summary as any)[key] += val;
                if (!summary.sources[key]) summary.sources[key] = [];
                summary.sources[key].push(cond.name);
            }
        }

        // Boolean flags — OR
        if (mods.loseDexToAC) {
            summary.loseDexToAC = true;
            if (!summary.sources['loseDexToAC']) summary.sources['loseDexToAC'] = [];
            summary.sources['loseDexToAC'].push(cond.name);
        }
        if (mods.effectiveDex0) {
            summary.effectiveDex0 = true;
            if (!summary.sources['effectiveDex0']) summary.sources['effectiveDex0'] = [];
            summary.sources['effectiveDex0'].push(cond.name);
        }
        if (mods.effectiveStr0) {
            summary.effectiveStr0 = true;
            if (!summary.sources['effectiveStr0']) summary.sources['effectiveStr0'] = [];
            summary.sources['effectiveStr0'].push(cond.name);
        }
        if (mods.cantAct) {
            summary.cantAct = true;
            if (!summary.sources['cantAct']) summary.sources['cantAct'] = [];
            summary.sources['cantAct'].push(cond.name);
        }

        // Speed — worst wins
        if (mods.speed === 'zero') {
            summary.speed = 'zero';
            if (!summary.sources['speed']) summary.sources['speed'] = [];
            summary.sources['speed'].push(cond.name);
        } else if (mods.speed === 'half' && summary.speed !== 'zero') {
            summary.speed = 'half';
            if (!summary.sources['speed']) summary.sources['speed'] = [];
            summary.sources['speed'].push(cond.name);
        }
    }

    return summary;
}

// ─── Deity / Patron Options (Dark Sun) ────────────────────────────
export const ELEMENTAL_PATRONS = ['Air', 'Earth', 'Fire', 'Water'] as const;

export const SORCERER_KINGS = [
    { name: 'Hamanu', city: 'Urik' },
    { name: 'Nibenay', city: 'Nibenay' },
    { name: 'Lalali-Puy', city: 'Gulg' },
    { name: 'Tectuktitlay', city: 'Draj' },
    { name: 'Andropinis', city: 'Balic' },
    { name: 'Abalach-Re', city: 'Raam' },
    { name: 'Daskinor', city: 'Eldaarich' },
    { name: 'Oronis', city: 'Kurn' },
    { name: 'Dregoth', city: 'Giustenal' },
] as const;

// ─── Multiclass Support (D&D 3.5e) ───────────────────────────────

// ClassEntry and ClassDataEntry types imported from ./types

/** BAB for a single class at a given level */
export function babForProgression(progression: string, level: number): number {
    if (progression === 'full') return level;
    if (progression === 'three_quarter') return Math.floor(level * 3 / 4);
    return Math.floor(level / 2); // 'half'
}

/** Single save bonus (base only, no ability mod) */
export function saveBonus(isGood: boolean, level: number): number {
    return isGood ? 2 + Math.floor(level / 2) : Math.floor(level / 3);
}

/** Combined multiclass BAB — sum each class's BAB contribution */
export function multiclassBAB(entries: ClassEntry[], classDataMap: Record<string, ClassDataEntry>): number {
    return entries.reduce((total, e) => {
        const cd = classDataMap[e.className];
        if (!cd) return total;
        return total + babForProgression(cd.babProgression, e.level);
    }, 0);
}

/** Combined multiclass saves — sum each class's base save bonus */
export function multiclassSaves(
    entries: ClassEntry[],
    classDataMap: Record<string, ClassDataEntry>,
): { fort: number; ref: number; will: number } {
    let fort = 0, ref = 0, will = 0;
    for (const e of entries) {
        const cd = classDataMap[e.className];
        if (!cd) continue;
        fort += saveBonus(cd.goodSaves.includes('fort'), e.level);
        ref  += saveBonus(cd.goodSaves.includes('ref'), e.level);
        will += saveBonus(cd.goodSaves.includes('will'), e.level);
    }
    return { fort, ref, will };
}

/** Multiclass HP: first class gets max hit die at level 1, rest are average (hitDie/2 + 1) */
export function multiclassHP(entries: ClassEntry[], classDataMap: Record<string, ClassDataEntry>, conMod: number): number {
    let hp = 0;
    let isFirstLevel = true;
    for (const e of entries) {
        const cd = classDataMap[e.className];
        if (!cd) continue;
        for (let lvl = 1; lvl <= e.level; lvl++) {
            if (isFirstLevel) {
                hp += cd.hitDie + conMod; // Max hit die at character level 1
                isFirstLevel = false;
            } else {
                hp += Math.floor(cd.hitDie / 2) + 1 + conMod; // Average + CON
            }
        }
    }
    return Math.max(1, hp);
}

/**
 * XP penalty for uneven multiclass (3.5e SRD rule).
 * -20% per pair of classes more than 1 level apart.
 * Favored class (highest or "Any") is ignored.
 */
export function xpPenaltyPercent(entries: ClassEntry[], favoredClass: string): number {
    if (entries.length <= 1) return 0;
    // Determine which class to ignore for penalty
    const sorted = [...entries].sort((a, b) => b.level - a.level);
    let ignoredIndex = -1;
    if (favoredClass === 'Any') {
        // Ignore the highest-level class
        ignoredIndex = 0;
    } else {
        const favIdx = sorted.findIndex(e => e.className === favoredClass);
        if (favIdx >= 0) ignoredIndex = favIdx;
    }
    const considered = sorted.filter((_, i) => i !== ignoredIndex);
    if (considered.length <= 1) return 0;

    let penalty = 0;
    for (let i = 0; i < considered.length - 1; i++) {
        if (considered[i].level - considered[i + 1].level > 1) {
            penalty += 20;
        }
    }
    return penalty;
}

/** XP threshold for multiclass: use the highest class's XP requirement */
export function multiclassXpForLevel(entries: ClassEntry[], totalLevel: number): number {
    if (entries.length === 0) return 0;
    // Use highest XP requirement among classes
    let maxXp = 0;
    for (const e of entries) {
        const xp = xpForLevel(e.className, totalLevel);
        if (xp > maxXp) maxXp = xp;
    }
    return maxXp;
}

/** Format class entries as display string: "Fighter 3 / Rogue 2" */
export function formatClassLevels(entries: ClassEntry[]): string {
    if (entries.length === 0) return 'No Class';
    return entries.map(e => `${e.className} ${e.level}`).join(' / ');
}

/** Get total level from class entries */
export function totalLevel(entries: ClassEntry[]): number {
    return entries.reduce((sum, e) => sum + e.level, 0);
}

/** Check if any class in entries is a caster class */
export function hasCasterClass(entries: ClassEntry[]): boolean {
    const CASTER_CLASSES = ['Cleric', 'Defiler', 'Preserver', 'Templar'];
    return entries.some(e => CASTER_CLASSES.includes(e.className));
}

// ─── Level-Up Helpers ─────────────────────────────────────────────

/** Character levels that earn a general feat (every 3rd level) */
export const FEAT_LEVELS = [1, 3, 6, 9, 12, 15, 18];

/** Character levels that earn +1 ability score increase (every 4th level) */
export const ABILITY_BOOST_LEVELS = [4, 8, 12, 16, 20];

/** Check if this character level earns a general feat */
export function earnsFeatAtLevel(characterLevel: number): boolean {
    return FEAT_LEVELS.includes(characterLevel);
}

/** Check if this character level earns an ability score increase */
export function earnsAbilityBoostAtLevel(characterLevel: number): boolean {
    return ABILITY_BOOST_LEVELS.includes(characterLevel);
}

/** Skill points earned at a given level (class base + INT mod, minimum 1) */
export function skillPointsForLevel(skillPointsPerLevel: number, intMod: number, isFirstLevel: boolean): number {
    const base = Math.max(1, skillPointsPerLevel + intMod);
    // First character level gets 4x skill points
    return isFirstLevel ? base * 4 : base;
}

/** Maximum ranks in a skill at a given character level */
export function maxSkillRank(characterLevel: number, isClassSkill: boolean): number {
    const cap = characterLevel + 3;
    return isClassSkill ? cap : Math.floor(cap / 2);
}

/** Get class features gained at a specific class level */
export function classFeaturesAtLevel(classData: ClassData, classLevel: number): ClassFeature[] {
    if (!classData.classFeatures) return [];
    return classData.classFeatures.filter(f => f.level === classLevel);
}

/** Get all class features up to and including a class level */
export function classFeaturesUpToLevel(classData: ClassData, classLevel: number): ClassFeature[] {
    if (!classData.classFeatures) return [];
    return classData.classFeatures.filter(f => f.level <= classLevel);
}

/** Check if a class grants a bonus feat at this class level */
export function classGrantsBonusFeatAtLevel(classData: ClassData, classLevel: number): boolean {
    return classData.bonusFeatLevels?.includes(classLevel) ?? false;
}

/** Check if class has psionic progression */
export function hasPsionicProgression(entries: ClassEntry[]): boolean {
    return entries.some(e => e.className === 'Psionicist');
}

// ─── Feat Prerequisite Checking ──────────────────────────────────

const CASTER_CLASSES_SET = new Set(['Cleric', 'Defiler', 'Preserver', 'Templar', 'Druid']);

const ABILITY_MAP: Record<string, string> = {
    strength: 'strength', str: 'strength',
    dexterity: 'dexterity', dex: 'dexterity',
    constitution: 'constitution', con: 'constitution',
    intelligence: 'intelligence', int: 'intelligence',
    wisdom: 'wisdom', wis: 'wisdom',
    charisma: 'charisma', cha: 'charisma',
};

// PrereqCheckResult and CharacterPrereqData types imported from ./types

/** Check all structured prerequisites against a character's state */
export function checkFeatPrerequisites(
    prereqs: StructuredPrereqs | undefined,
    character: CharacterPrereqData,
): PrereqCheckResult {
    if (!prereqs) return { met: true, details: [], warnings: [] };

    const details: { label: string; met: boolean }[] = [];
    const warnings: string[] = [];

    // Ability score requirements
    if (prereqs.abilityScores) {
        for (const req of prereqs.abilityScores) {
            const key = ABILITY_MAP[req.ability] || req.ability;
            const value = character[key as keyof CharacterPrereqData] as number ?? 0;
            const abbr = key.charAt(0).toUpperCase() + key.slice(1, 3).toUpperCase();
            details.push({
                label: `${abbr} ${req.minimum}`,
                met: value >= req.minimum,
            });
        }
    }

    // Feat requirements
    if (prereqs.feats) {
        const ownedFeatNames = new Set(
            (character.feats || []).map(f => f.name.toLowerCase()),
        );
        for (const reqFeat of prereqs.feats) {
            details.push({
                label: reqFeat,
                met: ownedFeatNames.has(reqFeat.toLowerCase()),
            });
        }
    }

    // BAB requirement
    if (prereqs.bab != null) {
        details.push({
            label: `BAB +${prereqs.bab}`,
            met: character.baseAttackBonus >= prereqs.bab,
        });
    }

    // Class level requirements
    if (prereqs.classLevels) {
        for (const req of prereqs.classLevels) {
            const entry = (character.classLevels || []).find(
                e => e.className.toLowerCase() === req.className.toLowerCase(),
            );
            const level = entry?.level ?? 0;
            details.push({
                label: `${req.className} level ${req.level}`,
                met: level >= req.level,
            });
        }
    }

    // Character level requirement
    if (prereqs.characterLevel != null) {
        details.push({
            label: `Character level ${prereqs.characterLevel}`,
            met: character.level >= prereqs.characterLevel,
        });
    }

    // Caster level requirement
    if (prereqs.casterLevel != null) {
        const casterLevel = (character.classLevels || []).reduce((sum, e) => {
            return CASTER_CLASSES_SET.has(e.className) ? sum + e.level : sum;
        }, 0);
        details.push({
            label: `Caster level ${prereqs.casterLevel}`,
            met: casterLevel >= prereqs.casterLevel,
        });
    }

    // Skill rank requirements
    if (prereqs.skillRanks) {
        for (const req of prereqs.skillRanks) {
            const skill = (character.skills || []).find(
                s => s.name.toLowerCase() === req.skill.toLowerCase(),
            );
            const ranks = skill?.ranks ?? 0;
            details.push({
                label: `${req.skill} ${req.ranks} rank${req.ranks > 1 ? 's' : ''}`,
                met: ranks >= req.ranks,
            });
        }
    }

    // Special / un-checkable requirements → warnings
    if (prereqs.special) {
        warnings.push(...prereqs.special);
    }

    const met = details.every(d => d.met);
    return { met, details, warnings };
}

// ─── Spell Eligibility Checking ──────────────────────────────────

// SpellEligibility type imported from ./types

/**
 * Check if a character can learn a spell based on class and level.
 * @param spell - The compendium spell entry
 * @param characterClassLevels - The character's class levels
 * @param maxSpellLevelByClass - Map of className → max castable spell level (from spellProgression)
 */
export function checkSpellEligibility(
    spell: { level: number; classes: string[] },
    characterClassLevels: ClassEntry[],
    maxSpellLevelByClass: Record<string, number>,
): SpellEligibility {
    const reasons: string[] = [];

    // Find matching caster classes
    const characterClassNames = (characterClassLevels || []).map(e => e.className);
    const matchingClasses = spell.classes.filter(c => characterClassNames.includes(c));

    if (matchingClasses.length === 0) {
        reasons.push(`Requires class: ${spell.classes.join(', ')}`);
        return { eligible: false, reasons };
    }

    // Check if spell level is within range for any matching class
    let canCast = false;
    for (const className of matchingClasses) {
        const maxLevel = maxSpellLevelByClass[className];
        if (maxLevel != null && spell.level <= maxLevel) {
            canCast = true;
            break;
        }
    }

    if (!canCast) {
        const classDetails = matchingClasses
            .map(c => {
                const max = maxSpellLevelByClass[c];
                return max != null ? `${c}: max spell level ${max}` : `${c}: no spell data`;
            })
            .join(', ');
        reasons.push(`Spell level ${spell.level} exceeds current ability (${classDetails})`);
        return { eligible: false, reasons };
    }

    return { eligible: true, reasons: [] };
}

// ─── Shared UI Constants (deduplicated from CharacterSheet) ───────

/** Ability score definitions used in ability score grids and level-up wizard */
export const ABILITY_DEFINITIONS = [
    { key: 'strength', label: 'STR' },
    { key: 'dexterity', label: 'DEX' },
    { key: 'constitution', label: 'CON' },
    { key: 'intelligence', label: 'INT' },
    { key: 'wisdom', label: 'WIS' },
    { key: 'charisma', label: 'CHA' },
] as const;

/** Save definitions for rendering save inputs */
export const SAVE_DEFINITIONS = [
    { key: 'saveFort', label: 'FORT', ability: 'constitution' },
    { key: 'saveRef', label: 'REF', ability: 'dexterity' },
    { key: 'saveWill', label: 'WILL', ability: 'wisdom' },
] as const;

/** Spell schools including Dark Sun elemental domains */
export const SPELL_SCHOOLS = [
    'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
    'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
    'Air', 'Earth', 'Fire', 'Water', 'Cosmos',
] as const;

// ─── Weapon Breakage (Dark Sun 3.5e) ──────────────────────────
// On a natural 1 attack roll, non-metal weapons must save or break.
// Roll 1d20 — if result ≤ breakageDC, the weapon breaks.
export const MATERIAL_BREAKAGE_DC: Record<string, number | null> = {
    obsidian: 3,   // breaks on 1–3
    bone: 2,       // breaks on 1–2
    stone: 3,      // breaks on 1–3
    wood: 4,       // breaks on 1–4
    chitin: 2,     // breaks on 1–2
    hide: 5,       // breaks on 1–5
    metal: null,   // never breaks
    other: null,
};

/** Get breakage DC for a material, null = unbreakable */
export function getBreakageDC(material: string): number | null {
    return MATERIAL_BREAKAGE_DC[material?.toLowerCase()] ?? null;
}

/** Metal upgrade cost multiplier (Dark Sun canonical: ×100) */
export const METAL_COST_MULTIPLIER = 100;

/**
 * Parse a cost string (e.g. "10 cp") and return the ×100 metal-upgraded version.
 * Returns "—" for empty/unparseable inputs.
 */
export function metalUpgradeCost(cost: string | undefined | null): string {
    if (!cost || !cost.trim()) return '—';
    const match = cost.trim().match(/^([\d,]+(?:\.\d+)?)\s*(.*)$/);
    if (!match) return '—';
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (isNaN(amount)) return '—';
    const unit = match[2] || '';
    const upgraded = amount * METAL_COST_MULTIPLIER;
    const formatted = upgraded.toLocaleString('en-US');
    return unit ? `${formatted} ${unit}` : formatted;
}

// ─── Water Requirements by Race (gallons/day) ─────────────────
// Adapted from Dark Sun Expanded & Revised boxed set.
export const WATER_REQUIREMENTS: Record<string, { active: number; rest: number }> = {
    'Human':      { active: 1,    rest: 0.5 },
    'Elf':        { active: 0.5,  rest: 0.25 },
    'Half-Elf':   { active: 0.75, rest: 0.375 },
    'Dwarf':      { active: 1,    rest: 0.5 },
    'Mul':        { active: 1,    rest: 0.5 },
    'Half-Giant': { active: 2,    rest: 1 },
    'Thri-Kreen': { active: 0.25, rest: 0.125 },
    'Halfling':   { active: 0.5,  rest: 0.25 },
    'Pterran':    { active: 0.5,  rest: 0.25 },
    'Aarakocra':  { active: 0.5,  rest: 0.25 },
    'Dray':       { active: 0.75, rest: 0.375 },
};

/** Get daily water requirement for a race */
export function getWaterRequirement(race: string): { active: number; rest: number } {
    return WATER_REQUIREMENTS[race] || WATER_REQUIREMENTS['Human'];
}

// ─── Dehydration Stages (3.5e adapted) ────────────────────────
export const DEHYDRATION_STAGES: readonly DehydrationStageDef[] = [
    { stage: 0, name: 'Hydrated', icon: '💧', color: 'sky', penalties: null },
    { stage: 1, name: 'Thirsty', icon: '🏜️', color: 'yellow',
      penalties: '-1 to all attack rolls and ability checks' },
    { stage: 2, name: 'Dehydrated', icon: '🥵', color: 'orange',
      penalties: '-2 to all rolls, cannot run or charge. CON check DC 15 or 1d6 nonlethal' },
    { stage: 3, name: 'Severely Dehydrated', icon: '💀', color: 'red',
      penalties: '-4 to all rolls, CON check DC 15+n or unconscious, 1d6 lethal/hour' },
];

// ─── Heat & Sun Sickness (Dark Sun Boxed Set) ─────────────────
// Terrain determines how often CON checks are needed.
export const TERRAIN_HEAT_INTERVALS: readonly TerrainHeatDef[] = [
    { id: 'salt-flats',      name: 'Salt Flats',       checkIntervalHours: 1, icon: '🧂' },
    { id: 'sandy-wastes',    name: 'Sandy Wastes',     checkIntervalHours: 2, icon: '🏜️' },
    { id: 'rocky-badlands',  name: 'Rocky Badlands',   checkIntervalHours: 3, icon: '🪨' },
    { id: 'scrub-plains',    name: 'Scrub Plains',     checkIntervalHours: 4, icon: '🌾' },
    { id: 'verdant-belt',    name: 'Verdant Belt',     checkIntervalHours: 6, icon: '🌿' },
    { id: 'mountains',       name: 'Mountains/Forest', checkIntervalHours: 8, icon: '⛰️' },
];

// 4-stage sun sickness progression with machine-readable modifiers
export const HEAT_SICKNESS_STAGES: readonly HeatSicknessStageDef[] = [
    { stage: 0, name: 'Normal',       icon: '☀️', color: 'sky',    penalties: null, modifiers: null },
    { stage: 1, name: 'Heat Fatigue', icon: '🥵', color: 'yellow',
      penalties: '-1 to attack rolls, saves, and ability checks',
      modifiers: { attackRolls: -1, saves: -1, abilityChecks: -1 } },
    { stage: 2, name: 'Heat Stroke',  icon: '🔥', color: 'orange',
      penalties: '-2 to all rolls, half speed. CON check DC 15 or collapse.',
      modifiers: { attackRolls: -2, saves: -2, abilityChecks: -2, skillChecks: -2, speed: 'half' } },
    { stage: 3, name: 'Sunstroke',    icon: '💀', color: 'red',
      penalties: '-4 to all rolls, -2 AC. CON DC 15+hrs or unconscious. 1d6 lethal/hour.',
      modifiers: { attackRolls: -4, saves: -4, abilityChecks: -4, skillChecks: -4, ac: -2 } },
];

// Racial bonuses to CON saves vs heat
export const HEAT_RACIAL_MODIFIERS: readonly HeatRacialModDef[] = [
    { race: 'Thri-Kreen', conBonus: 4, notes: 'Insectoid physiology resists heat' },
    { race: 'Half-Giant', conBonus: 2, notes: 'Endurance from size' },
    { race: 'Elf',        conBonus: 2, notes: 'Temperature resilience (desert adapted)' },
    { race: 'Dray',       conBonus: 2, notes: 'Draconic heritage' },
];

const HEAT_RACIAL_MAP = new Map(HEAT_RACIAL_MODIFIERS.map(r => [r.race, r]));

/** Get racial heat resistance bonus, or null if none */
export function getHeatRacialBonus(race: string): HeatRacialModDef | null {
    return HEAT_RACIAL_MAP.get(race) ?? null;
}

/** Aggregate heat sickness penalties into a ConditionPenaltySummary (same shape as condition penalties) */
export function getHeatSicknessPenalties(stage: number): ConditionPenaltySummary {
    const summary: ConditionPenaltySummary = {
        str: 0, dex: 0, attackRolls: 0, damage: 0, ac: 0,
        saves: 0, skillChecks: 0, abilityChecks: 0, initiative: 0,
        speed: null, loseDexToAC: false, effectiveDex0: false,
        effectiveStr0: false, cantAct: false, sources: {},
    };

    const stageDef = HEAT_SICKNESS_STAGES[stage];
    if (!stageDef?.modifiers) return summary;
    const mods = stageDef.modifiers;
    const src = stageDef.name;

    for (const key of NUMERIC_MOD_KEYS) {
        const val = mods[key];
        if (typeof val === 'number') {
            (summary as any)[key] = val;
            summary.sources[key] = [src];
        }
    }
    if (mods.speed) {
        summary.speed = mods.speed;
        summary.sources['speed'] = [src];
    }
    if (mods.loseDexToAC) { summary.loseDexToAC = true; summary.sources['loseDexToAC'] = [src]; }
    if (mods.effectiveDex0) { summary.effectiveDex0 = true; summary.sources['effectiveDex0'] = [src]; }
    if (mods.effectiveStr0) { summary.effectiveStr0 = true; summary.sources['effectiveStr0'] = [src]; }
    if (mods.cantAct) { summary.cantAct = true; summary.sources['cantAct'] = [src]; }

    return summary;
}

// ─── Terrain Movement Modifiers (Dark Sun Boxed Set) ──────────
// Speed multipliers for overland travel by terrain type.
// Reuses terrain IDs from TERRAIN_HEAT_INTERVALS where applicable.
export const TERRAIN_MOVEMENT_MODIFIERS: readonly TerrainMovementDef[] = [
    { id: 'salt-flats',      name: 'Salt Flats',       icon: '🧂', multiplier: 1 },
    { id: 'sandy-wastes',    name: 'Sandy Wastes',     icon: '🏜️', multiplier: 0.5 },
    { id: 'rocky-badlands',  name: 'Rocky Badlands',   icon: '🪨', multiplier: 0.75 },
    { id: 'scrub-plains',    name: 'Scrub Plains',     icon: '🌾', multiplier: 0.75 },
    { id: 'verdant-belt',    name: 'Verdant Belt',     icon: '🌿', multiplier: 1 },
    { id: 'mountains',       name: 'Mountains/Forest', icon: '⛰️', multiplier: 0.5 },
    { id: 'boulder-fields',  name: 'Boulder Fields',   icon: '🪨', multiplier: 0.5 },
];

const TERRAIN_MOVE_MAP = new Map(TERRAIN_MOVEMENT_MODIFIERS.map(t => [t.id, t]));

/** Get terrain movement multiplier by ID. Falls back to 1 (normal) for unknown terrain. */
export function getTerrainMultiplier(terrainId: string): number {
    return TERRAIN_MOVE_MAP.get(terrainId)?.multiplier ?? 1;
}

// ─── Forced March (D&D 3.5e + Dark Sun) ───────────────────────
// After 8 hours of walking, each additional hour requires a CON
// check (DC 10 + extra hours). Failure → Fatigued → Exhausted → Collapsed.

/** Hours of travel per day before forced march checks begin. */
export const FORCED_MARCH_BASE_HOURS = 8;

/** 4-stage forced march progression with machine-readable modifiers. */
export const FORCED_MARCH_STAGES: readonly ForcedMarchStageDef[] = [
    { stage: 0, name: 'Normal',    icon: '🥾', color: 'sky',    penalties: null, modifiers: null },
    { stage: 1, name: 'Fatigued',  icon: '😴', color: 'yellow',
      penalties: '-2 STR, -2 DEX. Cannot run or charge.',
      modifiers: { str: -2, dex: -2, notes: 'Cannot run or charge.' } },
    { stage: 2, name: 'Exhausted', icon: '😩', color: 'orange',
      penalties: '-6 STR, -6 DEX, half speed. Cannot run or charge.',
      modifiers: { str: -6, dex: -6, speed: 'half', notes: 'Cannot run or charge.' } },
    { stage: 3, name: 'Collapsed', icon: '💀', color: 'red',
      penalties: 'Cannot move. Helpless. Must rest 8 hours to recover.',
      modifiers: { speed: 'zero', cantAct: true, notes: 'Collapsed from exhaustion. Must rest 8 hours.' } },
];

/** Forced march CON check DC = 10 + hours beyond the base limit. */
export function getForcedMarchDC(extraHours: number): number {
    return 10 + Math.max(0, Math.floor(extraHours));
}

/** Aggregate forced march penalties into a ConditionPenaltySummary (same shape as condition/heat penalties). */
export function getForcedMarchPenalties(stage: number): ConditionPenaltySummary {
    const summary: ConditionPenaltySummary = {
        str: 0, dex: 0, attackRolls: 0, damage: 0, ac: 0,
        saves: 0, skillChecks: 0, abilityChecks: 0, initiative: 0,
        speed: null, loseDexToAC: false, effectiveDex0: false,
        effectiveStr0: false, cantAct: false, sources: {},
    };

    const stageDef = FORCED_MARCH_STAGES[stage];
    if (!stageDef?.modifiers) return summary;
    const mods = stageDef.modifiers;
    const src = `March: ${stageDef.name}`;

    for (const key of NUMERIC_MOD_KEYS) {
        const val = mods[key];
        if (typeof val === 'number') {
            (summary as any)[key] = val;
            summary.sources[key] = [src];
        }
    }
    if (mods.speed) {
        summary.speed = mods.speed;
        summary.sources['speed'] = [src];
    }
    if (mods.loseDexToAC) { summary.loseDexToAC = true; summary.sources['loseDexToAC'] = [src]; }
    if (mods.effectiveDex0) { summary.effectiveDex0 = true; summary.sources['effectiveDex0'] = [src]; }
    if (mods.effectiveStr0) { summary.effectiveStr0 = true; summary.sources['effectiveStr0'] = [src]; }
    if (mods.cantAct) { summary.cantAct = true; summary.sources['cantAct'] = [src]; }

    return summary;
}

/**
 * Calculate overland travel distance in miles.
 * D&D 3.5e: 1 hour of walking = base speed / 5 miles (e.g. 30 ft → 6 mi/hr on roads).
 * On Athas there are no roads — terrain multiplier applies.
 */
export function calculateTravelDistance(baseSpeedFt: number, terrainId: string, hours: number): number {
    if (baseSpeedFt <= 0 || hours <= 0) return 0;
    const milesPerHour = (baseSpeedFt / 5) * getTerrainMultiplier(terrainId);
    return Math.round(milesPerHour * hours * 10) / 10; // one decimal place
}

// ─── Natural Healing (Dark Sun Desert Rules) ──────────────────────
// D&D 3.5e: 1 HP per character level per full day of rest.
// Long-term care (Heal DC 15): 2 HP per character level per day.
// Dark Sun: Healing is halved without adequate water AND shade.

/** Base natural healing rules. */
export const NATURAL_HEALING_RULES = {
    hpPerLevelPerDay: 1,            // base HP healed per level per day of rest
    longTermCareMultiplier: 2,      // multiplier with successful Heal DC 15 check
    healCheckDC: 15,                // Heal skill DC for long-term care
    desertPenaltyMultiplier: 0.5,   // healing multiplied by this without water/shade
} as const;

/**
 * Calculate natural healing rates based on desert conditions.
 * Healing is halved when the character lacks adequate water OR shade.
 * Both are required for normal healing under Athas's brutal sun.
 */
export function getNaturalHealing(
    characterLevel: number,
    hasAdequateWater: boolean,
    hasShade: boolean,
): NaturalHealingResult {
    const level = Math.max(1, Math.floor(characterLevel));
    const baseHpPerDay = level * NATURAL_HEALING_RULES.hpPerLevelPerDay;
    const baseLongTermCare = level * NATURAL_HEALING_RULES.hpPerLevelPerDay * NATURAL_HEALING_RULES.longTermCareMultiplier;

    const reasons: string[] = [];
    if (!hasAdequateWater) reasons.push('No adequate water');
    if (!hasShade) reasons.push('No shade or shelter');

    const isHalved = reasons.length > 0;
    const multiplier = isHalved ? NATURAL_HEALING_RULES.desertPenaltyMultiplier : 1;

    return {
        hpPerDay: Math.max(1, Math.floor(baseHpPerDay * multiplier)),
        hpLongTermCare: Math.max(1, Math.floor(baseLongTermCare * multiplier)),
        baseHpPerDay,
        baseLongTermCare,
        isHalved,
        reasons,
    };
}

export const DARK_SUN_RACES = [
    'Human', 'Elf', 'Half-Elf', 'Dwarf', 'Mul', 'Half-Giant',
    'Thri-Kreen', 'Halfling', 'Pterran', 'Aarakocra', 'Dray',
] as const;

/** Dark Sun playable classes */
export const DARK_SUN_CLASSES = [
    'Fighter', 'Gladiator', 'Ranger', 'Rogue', 'Bard',
    'Cleric', 'Druid', 'Psionicist',
    'Defiler', 'Preserver', 'Templar',
] as const;

/** Ability score → modifier (formatted as +N or -N) */
export function abilityMod(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Ability score → raw numeric modifier */
export function abilityModNum(score: number): number {
    return Math.floor((score - 10) / 2);
}

// ─── Character Field Whitelist ────────────────────────────────────
// Single source of truth for fields allowed on character create/update.
// Used by both REST routes and socket event handlers.

export const ALLOWED_CHARACTER_FIELDS = [
    'name', 'race', 'classLevel', 'level', 'alignment',
    'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
    'hitPointsMax', 'hitPointsCurrent', 'armorClass', 'baseAttackBonus', 'initiative', 'speed',
    'saveFort', 'saveRef', 'saveWill',
    'pspMax', 'pspCurrent',
    'skills', 'feats', 'powers', 'equipment', 'spells', 'spellSlots',
    'currencyCp', 'currencySp', 'currencyGp', 'currencyBits',
    'experiencePoints',
    'acArmor', 'acShield', 'acNatural', 'acDeflection', 'acMisc', 'acSizeMod',
    'gender', 'age', 'height', 'weight', 'deity', 'appearance', 'personality',
    'conditions', 'classLevels', 'classFeatures', 'levelHistory',
    'notes',
    'waterSupply', 'dehydrationStage',
    'heatSicknessStage', 'heatExposureHours',
    'marchHoursToday', 'forcedMarchStage',
] as const;
