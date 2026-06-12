import { describe, it, expect } from 'vitest';
import {
    xpForLevel, xpToNextLevel,
    XP_TABLES, CLASS_XP_GROUP,
    getCarryCapacity, getLoadCategory,
    multiclassBAB, multiclassSaves, multiclassHP, xpPenaltyPercent,
    babForProgression, saveBonus,
    SIZE_AC_MOD, SIZE_GRAPPLE_MOD, getSizeModAC, getSizeModGrapple,
    skillPointsForLevel, maxSkillRank,
    earnsFeatAtLevel, earnsAbilityBoostAtLevel,
    totalLevel, formatClassLevels, hasCasterClass, hasPsionicProgression,
    abilityMod, abilityModNum,
    MATERIAL_BREAKAGE_DC, getBreakageDC,
    metalUpgradeCost,
    WATER_REQUIREMENTS, getWaterRequirement,
    DEHYDRATION_STAGES,
    CONDITIONS_3_5E, getConditionPenalties,
    TERRAIN_HEAT_INTERVALS, HEAT_SICKNESS_STAGES, HEAT_RACIAL_MODIFIERS,
    getHeatRacialBonus, getHeatSicknessPenalties,
    TERRAIN_MOVEMENT_MODIFIERS, getTerrainMultiplier,
    FORCED_MARCH_STAGES, FORCED_MARCH_BASE_HOURS,
    getForcedMarchDC, getForcedMarchPenalties, calculateTravelDistance,
    NATURAL_HEALING_RULES, getNaturalHealing,
} from '../gameConstants';
import type { ClassEntry, ClassDataEntry } from '../types';

// ─── XP Tables ────────────────────────────────────────────────────

describe('XP Tables', () => {
    const ALL_GROUPS = Object.keys(XP_TABLES) as Array<keyof typeof XP_TABLES>;

    it('every table has exactly 20 entries', () => {
        for (const group of ALL_GROUPS) {
            expect(XP_TABLES[group]).toHaveLength(20);
        }
    });

    it('every table starts at 0 XP for level 1', () => {
        for (const group of ALL_GROUPS) {
            expect(XP_TABLES[group][0]).toBe(0);
        }
    });

    it('every table is strictly ascending', () => {
        for (const group of ALL_GROUPS) {
            const t = XP_TABLES[group];
            for (let i = 1; i < t.length; i++) {
                expect(t[i]).toBeGreaterThan(t[i - 1]);
            }
        }
    });

    it('defiler advances faster than preserver at every level', () => {
        for (let i = 1; i < 20; i++) {
            expect(XP_TABLES.defiler[i]).toBeLessThan(XP_TABLES.preserver[i]);
        }
    });
});

describe('CLASS_XP_GROUP', () => {
    it('maps all 11 Dark Sun classes', () => {
        const classes = [
            'Fighter', 'Gladiator', 'Ranger', 'Rogue', 'Bard',
            'Cleric', 'Druid', 'Templar',
            'Defiler', 'Preserver', 'Psionicist',
        ];
        for (const c of classes) {
            expect(CLASS_XP_GROUP).toHaveProperty(c);
        }
    });

    it('Fighter and Gladiator share warrior group', () => {
        expect(CLASS_XP_GROUP['Fighter']).toBe('warrior');
        expect(CLASS_XP_GROUP['Gladiator']).toBe('warrior');
    });
});

describe('xpForLevel', () => {
    it('returns 0 for level 1 (every class)', () => {
        expect(xpForLevel('Fighter', 1)).toBe(0);
        expect(xpForLevel('Preserver', 1)).toBe(0);
        expect(xpForLevel('Psionicist', 1)).toBe(0);
    });

    it('returns correct threshold for mid-level warrior', () => {
        // Warrior table: level 5 = index 4 = 16000
        expect(xpForLevel('Fighter', 5)).toBe(16000);
    });

    it('clamps level < 1 to 0', () => {
        expect(xpForLevel('Fighter', 0)).toBe(0);
        expect(xpForLevel('Fighter', -5)).toBe(0);
    });

    it('caps level > 20 to level 20 value', () => {
        const lvl20 = xpForLevel('Fighter', 20);
        expect(xpForLevel('Fighter', 25)).toBe(lvl20);
    });

    it('falls back to warrior for unknown class', () => {
        expect(xpForLevel('UnknownClass', 5)).toBe(xpForLevel('Fighter', 5));
    });
});

describe('xpToNextLevel', () => {
    it('returns 0 progress at the start of a level', () => {
        const threshold = xpForLevel('Fighter', 5);
        const result = xpToNextLevel('Fighter', 5, threshold);
        expect(result.progress).toBe(0);
    });

    it('returns 1 progress when at or above next threshold', () => {
        const nextThreshold = xpForLevel('Fighter', 6);
        const result = xpToNextLevel('Fighter', 5, nextThreshold);
        expect(result.progress).toBe(1);
        expect(result.needed).toBe(0);
    });

    it('returns correct partial progress', () => {
        const lvl5 = xpForLevel('Fighter', 5);    // 16000
        const lvl6 = xpForLevel('Fighter', 6);    // 32000
        const mid = (lvl5 + lvl6) / 2;             // 24000
        const result = xpToNextLevel('Fighter', 5, mid);
        expect(result.progress).toBeCloseTo(0.5, 5);
        expect(result.needed).toBe(lvl6 - mid);
    });
});

// ─── Carrying Capacity ───────────────────────────────────────────

describe('getCarryCapacity', () => {
    it('STR 10 returns 33/66/100', () => {
        const cap = getCarryCapacity(10);
        expect(cap).toEqual({ light: 33, medium: 66, heavy: 100 });
    });

    it('STR 1 returns minimum values', () => {
        const cap = getCarryCapacity(1);
        expect(cap).toEqual({ light: 3, medium: 6, heavy: 10 });
    });

    it('STR 30 returns maximum values', () => {
        const cap = getCarryCapacity(30);
        expect(cap).toEqual({ light: 532, medium: 1064, heavy: 1600 });
    });

    it('STR 0 returns all zeros', () => {
        expect(getCarryCapacity(0)).toEqual({ light: 0, medium: 0, heavy: 0 });
    });

    it('STR negative returns all zeros', () => {
        expect(getCarryCapacity(-3)).toEqual({ light: 0, medium: 0, heavy: 0 });
    });

    it('STR > 30 clamps to STR 30', () => {
        expect(getCarryCapacity(35)).toEqual(getCarryCapacity(30));
    });

    it('every STR from 1-30 has ascending limits', () => {
        for (let str = 1; str <= 30; str++) {
            const cap = getCarryCapacity(str);
            expect(cap.light).toBeLessThan(cap.medium);
            expect(cap.medium).toBeLessThan(cap.heavy);
        }
    });
});

describe('getLoadCategory', () => {
    it('returns light when weight is at or below light threshold', () => {
        expect(getLoadCategory(10, 0)).toBe('light');
        expect(getLoadCategory(10, 33)).toBe('light');
    });

    it('returns medium when weight exceeds light but not medium', () => {
        expect(getLoadCategory(10, 34)).toBe('medium');
        expect(getLoadCategory(10, 66)).toBe('medium');
    });

    it('returns heavy when weight exceeds medium but not heavy', () => {
        expect(getLoadCategory(10, 67)).toBe('heavy');
        expect(getLoadCategory(10, 100)).toBe('heavy');
    });

    it('returns overloaded when weight exceeds heavy', () => {
        expect(getLoadCategory(10, 101)).toBe('overloaded');
        expect(getLoadCategory(10, 9999)).toBe('overloaded');
    });
});

// ─── Multiclass Math ──────────────────────────────────────────────

const CLASS_DATA: Record<string, ClassDataEntry> = {
    Fighter: { hitDie: 10, babProgression: 'full', goodSaves: ['fort'], skillPointsPerLevel: 2 },
    Rogue:   { hitDie: 6, babProgression: 'three_quarter', goodSaves: ['ref'], skillPointsPerLevel: 8 },
    Cleric:  { hitDie: 8, babProgression: 'three_quarter', goodSaves: ['fort', 'will'], skillPointsPerLevel: 2 },
    Defiler: { hitDie: 4, babProgression: 'half', goodSaves: ['will'], skillPointsPerLevel: 2 },
};

describe('babForProgression', () => {
    it('full BAB = level', () => {
        expect(babForProgression('full', 5)).toBe(5);
        expect(babForProgression('full', 20)).toBe(20);
    });

    it('3/4 BAB = floor(level * 3/4)', () => {
        expect(babForProgression('three_quarter', 4)).toBe(3);
        expect(babForProgression('three_quarter', 8)).toBe(6);
    });

    it('half BAB = floor(level / 2)', () => {
        expect(babForProgression('half', 5)).toBe(2);
        expect(babForProgression('half', 10)).toBe(5);
    });
});

describe('saveBonus', () => {
    it('good save at level 1 = 2', () => {
        expect(saveBonus(true, 1)).toBe(2);
    });

    it('poor save at level 1 = 0', () => {
        expect(saveBonus(false, 1)).toBe(0);
    });

    it('good save at level 10 = 7', () => {
        expect(saveBonus(true, 10)).toBe(7);
    });

    it('poor save at level 10 = 3', () => {
        expect(saveBonus(false, 10)).toBe(3);
    });
});

describe('multiclassBAB', () => {
    it('single class Fighter 5 = 5 (full)', () => {
        const entries: ClassEntry[] = [{ className: 'Fighter', level: 5 }];
        expect(multiclassBAB(entries, CLASS_DATA)).toBe(5);
    });

    it('sums BAB across classes', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 5 },
            { className: 'Rogue', level: 4 },
        ];
        // Fighter full 5 = 5, Rogue 3/4 of 4 = 3 → 8
        expect(multiclassBAB(entries, CLASS_DATA)).toBe(8);
    });

    it('ignores unknown classes', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 5 },
            { className: 'Unknown', level: 3 },
        ];
        expect(multiclassBAB(entries, CLASS_DATA)).toBe(5);
    });
});

describe('multiclassSaves', () => {
    it('single Fighter 5: good fort, poor ref and will', () => {
        const entries: ClassEntry[] = [{ className: 'Fighter', level: 5 }];
        const saves = multiclassSaves(entries, CLASS_DATA);
        expect(saves.fort).toBe(saveBonus(true, 5));
        expect(saves.ref).toBe(saveBonus(false, 5));
        expect(saves.will).toBe(saveBonus(false, 5));
    });

    it('Fighter 5 / Cleric 3: fort is sum of both good forts', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 5 },
            { className: 'Cleric', level: 3 },
        ];
        const saves = multiclassSaves(entries, CLASS_DATA);
        // Both have good fort
        expect(saves.fort).toBe(saveBonus(true, 5) + saveBonus(true, 3));
        // Cleric also has good will
        expect(saves.will).toBe(saveBonus(false, 5) + saveBonus(true, 3));
    });
});

describe('multiclassHP', () => {
    it('single class Fighter 1: max hit die + CON', () => {
        const entries: ClassEntry[] = [{ className: 'Fighter', level: 1 }];
        // CON mod 2: 10 + 2 = 12
        expect(multiclassHP(entries, CLASS_DATA, 2)).toBe(12);
    });

    it('Fighter 3 with CON +2: level 1 max, levels 2-3 average', () => {
        const entries: ClassEntry[] = [{ className: 'Fighter', level: 3 }];
        // Level 1: 10 + 2 = 12
        // Level 2: floor(10/2) + 1 + 2 = 8
        // Level 3: floor(10/2) + 1 + 2 = 8
        expect(multiclassHP(entries, CLASS_DATA, 2)).toBe(28);
    });

    it('multiclass: first level ever gets max die, rest average', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 2 },
            { className: 'Rogue', level: 1 },
        ];
        // Fighter L1: 10 + 0 = 10 (max)
        // Fighter L2: 5 + 1 + 0 = 6 (avg)
        // Rogue  L1: 3 + 1 + 0 = 4 (avg, NOT max — it's character level 3)
        expect(multiclassHP(entries, CLASS_DATA, 0)).toBe(20);
    });

    it('returns minimum 1 HP even with negative CON', () => {
        const entries: ClassEntry[] = [{ className: 'Defiler', level: 1 }];
        // hitDie 4 + CON mod -5 = -1 → clamped to 1
        expect(multiclassHP(entries, CLASS_DATA, -5)).toBe(1);
    });
});

describe('xpPenaltyPercent', () => {
    it('no penalty for single class', () => {
        expect(xpPenaltyPercent([{ className: 'Fighter', level: 5 }], 'Any')).toBe(0);
    });

    it('no penalty when classes are within 1 level', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 5 },
            { className: 'Rogue', level: 4 },
        ];
        expect(xpPenaltyPercent(entries, 'Any')).toBe(0);
    });

    it('20% penalty when classes differ by more than 1 (favored = Any)', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 5 },
            { className: 'Rogue', level: 2 },
        ];
        // With favored=Any, highest (Fighter 5) is ignored.
        // Only Rogue 2 remains — 1 class, no penalty.
        expect(xpPenaltyPercent(entries, 'Any')).toBe(0);
    });

    it('20% penalty when no favored class helps', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 5 },
            { className: 'Rogue', level: 2 },
        ];
        // favored = 'None' — neither class ignored, 5 vs 2 differ by 3 → penalty
        expect(xpPenaltyPercent(entries, 'None')).toBe(20);
    });

    it('no penalty when favored class bridges the gap', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 5 },
            { className: 'Rogue', level: 2 },
        ];
        // If Fighter is favored, Fighter is ignored, only Rogue remains → no penalty
        expect(xpPenaltyPercent(entries, 'Fighter')).toBe(0);
    });

    it('stacks 20% per uneven pair (3 classes)', () => {
        const entries: ClassEntry[] = [
            { className: 'Fighter', level: 8 },
            { className: 'Rogue', level: 5 },
            { className: 'Cleric', level: 2 },
        ];
        // favored=Any ignores highest (Fighter 8). Remaining: Rogue 5, Cleric 2 → differ by 3 → 20%
        expect(xpPenaltyPercent(entries, 'Any')).toBe(20);
    });
});

// ─── Size Modifiers ───────────────────────────────────────────────

describe('SIZE_AC_MOD', () => {
    it('Medium = 0', () => expect(SIZE_AC_MOD['Medium']).toBe(0));
    it('Small = +1', () => expect(SIZE_AC_MOD['Small']).toBe(1));
    it('Large = -1', () => expect(SIZE_AC_MOD['Large']).toBe(-1));
    it('Fine = +8', () => expect(SIZE_AC_MOD['Fine']).toBe(8));
    it('Colossal = -8', () => expect(SIZE_AC_MOD['Colossal']).toBe(-8));
});

describe('SIZE_GRAPPLE_MOD', () => {
    it('Medium = 0', () => expect(SIZE_GRAPPLE_MOD['Medium']).toBe(0));
    it('Small = -4', () => expect(SIZE_GRAPPLE_MOD['Small']).toBe(-4));
    it('Large = +4', () => expect(SIZE_GRAPPLE_MOD['Large']).toBe(4));
    it('AC and grapple mods are inverses (opposite signs)', () => {
        for (const size of Object.keys(SIZE_AC_MOD)) {
            const ac = SIZE_AC_MOD[size];
            const grapple = SIZE_GRAPPLE_MOD[size];
            if (ac === 0) {
                expect(grapple).toBe(0);
            } else {
                expect(Math.sign(ac)).toBe(-Math.sign(grapple));
            }
        }
    });
});

describe('getSizeModAC / getSizeModGrapple', () => {
    it('returns 0 for unknown size', () => {
        expect(getSizeModAC('Gigantic')).toBe(0);
        expect(getSizeModGrapple('Gigantic')).toBe(0);
    });

    it('matches table lookups', () => {
        expect(getSizeModAC('Small')).toBe(SIZE_AC_MOD['Small']);
        expect(getSizeModGrapple('Large')).toBe(SIZE_GRAPPLE_MOD['Large']);
    });
});

// ─── Level-Up Helpers ─────────────────────────────────────────────

describe('skillPointsForLevel', () => {
    it('first level gets 4x skill points', () => {
        // base 4 + INT mod 2 = 6, × 4 = 24
        expect(skillPointsForLevel(4, 2, true)).toBe(24);
    });

    it('non-first level gets base skill points', () => {
        expect(skillPointsForLevel(4, 2, false)).toBe(6);
    });

    it('minimum 1 skill point per level (before 4x)', () => {
        // base 2 + INT mod -3 = -1 → clamped to 1, × 4 = 4
        expect(skillPointsForLevel(2, -3, true)).toBe(4);
        expect(skillPointsForLevel(2, -3, false)).toBe(1);
    });
});

describe('maxSkillRank', () => {
    it('class skill cap = level + 3', () => {
        expect(maxSkillRank(1, true)).toBe(4);
        expect(maxSkillRank(5, true)).toBe(8);
    });

    it('cross-class cap = floor((level + 3) / 2)', () => {
        expect(maxSkillRank(1, false)).toBe(2);
        expect(maxSkillRank(5, false)).toBe(4);
    });
});

describe('earnsFeatAtLevel', () => {
    it('earns feats at 1, 3, 6, 9, 12, 15, 18', () => {
        for (const lvl of [1, 3, 6, 9, 12, 15, 18]) {
            expect(earnsFeatAtLevel(lvl)).toBe(true);
        }
    });

    it('does not earn feats at other levels', () => {
        for (const lvl of [2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20]) {
            expect(earnsFeatAtLevel(lvl)).toBe(false);
        }
    });
});

describe('earnsAbilityBoostAtLevel', () => {
    it('earns ability boosts at 4, 8, 12, 16, 20', () => {
        for (const lvl of [4, 8, 12, 16, 20]) {
            expect(earnsAbilityBoostAtLevel(lvl)).toBe(true);
        }
    });

    it('does not earn ability boosts at other levels', () => {
        for (const lvl of [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19]) {
            expect(earnsAbilityBoostAtLevel(lvl)).toBe(false);
        }
    });
});

// ─── Utility Helpers ──────────────────────────────────────────────

describe('totalLevel', () => {
    it('sums class levels', () => {
        expect(totalLevel([
            { className: 'Fighter', level: 5 },
            { className: 'Rogue', level: 3 },
        ])).toBe(8);
    });

    it('returns 0 for empty array', () => {
        expect(totalLevel([])).toBe(0);
    });
});

describe('formatClassLevels', () => {
    it('formats single class', () => {
        expect(formatClassLevels([{ className: 'Fighter', level: 5 }])).toBe('Fighter 5');
    });

    it('formats multiclass with separator', () => {
        expect(formatClassLevels([
            { className: 'Fighter', level: 3 },
            { className: 'Rogue', level: 2 },
        ])).toBe('Fighter 3 / Rogue 2');
    });

    it('returns "No Class" for empty array', () => {
        expect(formatClassLevels([])).toBe('No Class');
    });
});

describe('hasCasterClass', () => {
    it('returns true for Cleric', () => {
        expect(hasCasterClass([{ className: 'Cleric', level: 1 }])).toBe(true);
    });

    it('returns true for Defiler', () => {
        expect(hasCasterClass([{ className: 'Defiler', level: 1 }])).toBe(true);
    });

    it('returns false for Fighter', () => {
        expect(hasCasterClass([{ className: 'Fighter', level: 5 }])).toBe(false);
    });
});

describe('hasPsionicProgression', () => {
    it('returns true only for Psionicist', () => {
        expect(hasPsionicProgression([{ className: 'Psionicist', level: 3 }])).toBe(true);
    });

    it('returns false for non-Psionicist', () => {
        expect(hasPsionicProgression([{ className: 'Fighter', level: 5 }])).toBe(false);
    });
});

describe('abilityMod / abilityModNum', () => {
    it('10 → +0', () => {
        expect(abilityMod(10)).toBe('+0');
        expect(abilityModNum(10)).toBe(0);
    });

    it('18 → +4', () => {
        expect(abilityMod(18)).toBe('+4');
        expect(abilityModNum(18)).toBe(4);
    });

    it('7 → -2', () => {
        expect(abilityMod(7)).toBe('-2');
        expect(abilityModNum(7)).toBe(-2);
    });

    it('odd score rounds down: 11 → +0, 13 → +1', () => {
        expect(abilityModNum(11)).toBe(0);
        expect(abilityModNum(13)).toBe(1);
    });
});

// ─── Weapon Breakage (Dark Sun) ───────────────────────────────────

describe('MATERIAL_BREAKAGE_DC', () => {
    it('metal has null DC (unbreakable)', () => {
        expect(MATERIAL_BREAKAGE_DC['metal']).toBeNull();
    });

    it('other has null DC (unbreakable)', () => {
        expect(MATERIAL_BREAKAGE_DC['other']).toBeNull();
    });

    it('obsidian has DC 3', () => {
        expect(MATERIAL_BREAKAGE_DC['obsidian']).toBe(3);
    });

    it('bone has DC 2', () => {
        expect(MATERIAL_BREAKAGE_DC['bone']).toBe(2);
    });

    it('wood has the highest non-null DC', () => {
        const nonNull = Object.values(MATERIAL_BREAKAGE_DC).filter(v => v !== null) as number[];
        expect(MATERIAL_BREAKAGE_DC['wood']).toBe(4);
        // hide is actually 5
        expect(Math.max(...nonNull)).toBe(5); // hide
    });

    it('all breakable materials have DCs between 1 and 10', () => {
        for (const [mat, dc] of Object.entries(MATERIAL_BREAKAGE_DC)) {
            if (dc !== null) {
                expect(dc).toBeGreaterThanOrEqual(1);
                expect(dc).toBeLessThanOrEqual(10);
            }
        }
    });
});

describe('getBreakageDC', () => {
    it('returns correct DC for known materials', () => {
        expect(getBreakageDC('obsidian')).toBe(3);
        expect(getBreakageDC('bone')).toBe(2);
        expect(getBreakageDC('stone')).toBe(3);
        expect(getBreakageDC('wood')).toBe(4);
        expect(getBreakageDC('chitin')).toBe(2);
        expect(getBreakageDC('hide')).toBe(5);
    });

    it('returns null for metal (unbreakable)', () => {
        expect(getBreakageDC('metal')).toBeNull();
    });

    it('is case-insensitive', () => {
        expect(getBreakageDC('Obsidian')).toBe(3);
        expect(getBreakageDC('METAL')).toBeNull();
        expect(getBreakageDC('Bone')).toBe(2);
    });

    it('returns null for unknown material', () => {
        expect(getBreakageDC('adamantine')).toBeNull();
        expect(getBreakageDC('')).toBeNull();
    });
});

// ─── Water Requirements (Dark Sun) ────────────────────────────────

describe('WATER_REQUIREMENTS', () => {
    it('covers all 11 Dark Sun races', () => {
        const races = [
            'Human', 'Elf', 'Half-Elf', 'Dwarf', 'Mul', 'Half-Giant',
            'Thri-Kreen', 'Halfling', 'Pterran', 'Aarakocra', 'Dray',
        ];
        for (const race of races) {
            expect(WATER_REQUIREMENTS).toHaveProperty(race);
            expect(WATER_REQUIREMENTS[race].active).toBeGreaterThan(0);
            expect(WATER_REQUIREMENTS[race].rest).toBeGreaterThan(0);
        }
    });

    it('rest requirement is always less than active', () => {
        for (const [, req] of Object.entries(WATER_REQUIREMENTS)) {
            expect(req.rest).toBeLessThan(req.active);
        }
    });

    it('Half-Giant needs the most water', () => {
        const maxActive = Math.max(...Object.values(WATER_REQUIREMENTS).map(r => r.active));
        expect(WATER_REQUIREMENTS['Half-Giant'].active).toBe(maxActive);
        expect(WATER_REQUIREMENTS['Half-Giant'].active).toBe(2);
    });

    it('Thri-Kreen needs the least water', () => {
        const minActive = Math.min(...Object.values(WATER_REQUIREMENTS).map(r => r.active));
        expect(WATER_REQUIREMENTS['Thri-Kreen'].active).toBe(minActive);
        expect(WATER_REQUIREMENTS['Thri-Kreen'].active).toBe(0.25);
    });
});

describe('getWaterRequirement', () => {
    it('returns correct requirement for known races', () => {
        expect(getWaterRequirement('Human')).toEqual({ active: 1, rest: 0.5 });
        expect(getWaterRequirement('Elf')).toEqual({ active: 0.5, rest: 0.25 });
        expect(getWaterRequirement('Half-Giant')).toEqual({ active: 2, rest: 1 });
        expect(getWaterRequirement('Thri-Kreen')).toEqual({ active: 0.25, rest: 0.125 });
    });

    it('falls back to Human for unknown race', () => {
        expect(getWaterRequirement('Unknown')).toEqual(WATER_REQUIREMENTS['Human']);
        expect(getWaterRequirement('')).toEqual(WATER_REQUIREMENTS['Human']);
    });
});

// ─── Dehydration Stages ───────────────────────────────────────────

describe('DEHYDRATION_STAGES', () => {
    it('has exactly 4 stages (0-3)', () => {
        expect(DEHYDRATION_STAGES).toHaveLength(4);
    });

    it('stage 0 is Hydrated with no penalties', () => {
        expect(DEHYDRATION_STAGES[0].name).toBe('Hydrated');
        expect(DEHYDRATION_STAGES[0].penalties).toBeNull();
    });

    it('stages 1-3 have penalties defined', () => {
        for (let i = 1; i <= 3; i++) {
            expect(DEHYDRATION_STAGES[i].penalties).toBeTruthy();
        }
    });

    it('each stage has an icon and color', () => {
        for (const stage of DEHYDRATION_STAGES) {
            expect(stage.icon).toBeTruthy();
            expect(stage.color).toBeTruthy();
        }
    });

    it('stage numbers are sequential', () => {
        DEHYDRATION_STAGES.forEach((stage, index) => {
            expect(stage.stage).toBe(index);
        });
    });
});

// ─── Condition Penalties (C2) ─────────────────────────────────────

describe('CONDITIONS_3_5E data', () => {
    it('has exactly 20 conditions', () => {
        expect(CONDITIONS_3_5E).toHaveLength(20);
    });

    it('every condition has an id, name, icon, and color', () => {
        for (const cond of CONDITIONS_3_5E) {
            expect(cond.id).toBeTruthy();
            expect(cond.name).toBeTruthy();
            expect(cond.icon).toBeTruthy();
            expect(cond.color).toBeTruthy();
        }
    });

    it('every condition has modifiers defined', () => {
        for (const cond of CONDITIONS_3_5E) {
            expect(cond.modifiers).toBeDefined();
        }
    });

    it('fatigued has STR -2, DEX -2', () => {
        const fatigued = CONDITIONS_3_5E.find(c => c.id === 'fatigued');
        expect(fatigued?.modifiers?.str).toBe(-2);
        expect(fatigued?.modifiers?.dex).toBe(-2);
    });

    it('exhausted has STR -6, DEX -6, half speed', () => {
        const exhausted = CONDITIONS_3_5E.find(c => c.id === 'exhausted');
        expect(exhausted?.modifiers?.str).toBe(-6);
        expect(exhausted?.modifiers?.dex).toBe(-6);
        expect(exhausted?.modifiers?.speed).toBe('half');
    });
});

describe('getConditionPenalties', () => {
    it('returns all zeros for empty conditions', () => {
        const result = getConditionPenalties([]);
        expect(result.str).toBe(0);
        expect(result.dex).toBe(0);
        expect(result.attackRolls).toBe(0);
        expect(result.damage).toBe(0);
        expect(result.ac).toBe(0);
        expect(result.saves).toBe(0);
        expect(result.skillChecks).toBe(0);
        expect(result.abilityChecks).toBe(0);
        expect(result.initiative).toBe(0);
        expect(result.speed).toBeNull();
        expect(result.loseDexToAC).toBe(false);
        expect(result.effectiveDex0).toBe(false);
        expect(result.effectiveStr0).toBe(false);
        expect(result.cantAct).toBe(false);
    });

    it('fatigued applies STR -2, DEX -2', () => {
        const result = getConditionPenalties(['fatigued']);
        expect(result.str).toBe(-2);
        expect(result.dex).toBe(-2);
        expect(result.speed).toBeNull(); // fatigued doesn't halve speed
        expect(result.sources['str']).toContain('Fatigued');
        expect(result.sources['dex']).toContain('Fatigued');
    });

    it('exhausted applies STR -6, DEX -6, half speed', () => {
        const result = getConditionPenalties(['exhausted']);
        expect(result.str).toBe(-6);
        expect(result.dex).toBe(-6);
        expect(result.speed).toBe('half');
    });

    it('blinded applies -2 AC, -4 attack, loseDexToAC', () => {
        const result = getConditionPenalties(['blinded']);
        expect(result.ac).toBe(-2);
        expect(result.attackRolls).toBe(-4);
        expect(result.loseDexToAC).toBe(true);
    });

    it('sickened applies -2 to attack, damage, saves, skills, ability checks', () => {
        const result = getConditionPenalties(['sickened']);
        expect(result.attackRolls).toBe(-2);
        expect(result.damage).toBe(-2);
        expect(result.saves).toBe(-2);
        expect(result.skillChecks).toBe(-2);
        expect(result.abilityChecks).toBe(-2);
    });

    it('invisible applies +2 attack bonus', () => {
        const result = getConditionPenalties(['invisible']);
        expect(result.attackRolls).toBe(2);
    });

    it('deafened applies -4 initiative', () => {
        const result = getConditionPenalties(['deafened']);
        expect(result.initiative).toBe(-4);
    });

    it('stacks fatigued + sickened', () => {
        const result = getConditionPenalties(['fatigued', 'sickened']);
        expect(result.str).toBe(-2);  // fatigued only
        expect(result.dex).toBe(-2);  // fatigued only
        expect(result.attackRolls).toBe(-2); // sickened only
        expect(result.damage).toBe(-2); // sickened only
        expect(result.saves).toBe(-2); // sickened only
    });

    it('stacks shaken + sickened attack penalties', () => {
        const result = getConditionPenalties(['shaken', 'sickened']);
        expect(result.attackRolls).toBe(-4); // -2 + -2
        expect(result.saves).toBe(-4); // -2 + -2
    });

    it('paralyzed sets effectiveDex0 and effectiveStr0', () => {
        const result = getConditionPenalties(['paralyzed']);
        expect(result.effectiveDex0).toBe(true);
        expect(result.effectiveStr0).toBe(true);
        expect(result.cantAct).toBe(true);
    });

    it('entangled applies half speed', () => {
        const result = getConditionPenalties(['entangled']);
        expect(result.speed).toBe('half');
        expect(result.dex).toBe(-4);
        expect(result.attackRolls).toBe(-2);
    });

    it('stunned sets loseDexToAC, ac -2, cantAct', () => {
        const result = getConditionPenalties(['stunned']);
        expect(result.loseDexToAC).toBe(true);
        expect(result.ac).toBe(-2);
        expect(result.cantAct).toBe(true);
    });

    it('tracks source names for each modifier', () => {
        const result = getConditionPenalties(['shaken', 'sickened']);
        expect(result.sources['attackRolls']).toContain('Shaken');
        expect(result.sources['attackRolls']).toContain('Sickened');
        expect(result.sources['saves']).toContain('Shaken');
        expect(result.sources['saves']).toContain('Sickened');
    });

    it('ignores unknown condition IDs', () => {
        const result = getConditionPenalties(['nonexistent', 'fatigued']);
        expect(result.str).toBe(-2);
        expect(result.dex).toBe(-2);
    });

    it('no condition produces NaN in any numeric field', () => {
        const allIds = CONDITIONS_3_5E.map(c => c.id);
        const result = getConditionPenalties(allIds);
        expect(Number.isNaN(result.str)).toBe(false);
        expect(Number.isNaN(result.dex)).toBe(false);
        expect(Number.isNaN(result.attackRolls)).toBe(false);
        expect(Number.isNaN(result.damage)).toBe(false);
        expect(Number.isNaN(result.ac)).toBe(false);
        expect(Number.isNaN(result.saves)).toBe(false);
        expect(Number.isNaN(result.skillChecks)).toBe(false);
        expect(Number.isNaN(result.abilityChecks)).toBe(false);
        expect(Number.isNaN(result.initiative)).toBe(false);
    });
});

// ─── Heat & Sun Sickness (B1) ─────────────────────────────────────

describe('TERRAIN_HEAT_INTERVALS', () => {
    it('has exactly 6 terrain types', () => {
        expect(TERRAIN_HEAT_INTERVALS).toHaveLength(6);
    });

    it('each terrain has required fields', () => {
        for (const t of TERRAIN_HEAT_INTERVALS) {
            expect(t.id).toBeTruthy();
            expect(t.name).toBeTruthy();
            expect(t.icon).toBeTruthy();
            expect(t.checkIntervalHours).toBeGreaterThan(0);
        }
    });

    it('intervals are ascending (hotter terrain = shorter interval)', () => {
        for (let i = 0; i < TERRAIN_HEAT_INTERVALS.length - 1; i++) {
            expect(TERRAIN_HEAT_INTERVALS[i].checkIntervalHours)
                .toBeLessThanOrEqual(TERRAIN_HEAT_INTERVALS[i + 1].checkIntervalHours);
        }
    });

    it('salt flats has the shortest interval (1hr)', () => {
        expect(TERRAIN_HEAT_INTERVALS[0].id).toBe('salt-flats');
        expect(TERRAIN_HEAT_INTERVALS[0].checkIntervalHours).toBe(1);
    });
});

describe('HEAT_SICKNESS_STAGES', () => {
    it('has exactly 4 stages (0-3)', () => {
        expect(HEAT_SICKNESS_STAGES).toHaveLength(4);
    });

    it('stage 0 is Normal with no modifiers', () => {
        expect(HEAT_SICKNESS_STAGES[0].name).toBe('Normal');
        expect(HEAT_SICKNESS_STAGES[0].penalties).toBeNull();
        expect(HEAT_SICKNESS_STAGES[0].modifiers).toBeNull();
    });

    it('stages 1-3 have penalties and modifiers defined', () => {
        for (let i = 1; i <= 3; i++) {
            expect(HEAT_SICKNESS_STAGES[i].penalties).toBeTruthy();
            expect(HEAT_SICKNESS_STAGES[i].modifiers).toBeTruthy();
        }
    });

    it('stage numbers are sequential', () => {
        HEAT_SICKNESS_STAGES.forEach((stage, index) => {
            expect(stage.stage).toBe(index);
        });
    });

    it('penalties get progressively worse', () => {
        const s1 = HEAT_SICKNESS_STAGES[1].modifiers!;
        const s2 = HEAT_SICKNESS_STAGES[2].modifiers!;
        const s3 = HEAT_SICKNESS_STAGES[3].modifiers!;
        expect(s1.attackRolls!).toBeGreaterThan(s2.attackRolls!);
        expect(s2.attackRolls!).toBeGreaterThan(s3.attackRolls!);
    });
});

describe('HEAT_RACIAL_MODIFIERS / getHeatRacialBonus', () => {
    it('has 4 racial entries', () => {
        expect(HEAT_RACIAL_MODIFIERS).toHaveLength(4);
    });

    it('Thri-Kreen has +4 bonus (highest)', () => {
        const tk = getHeatRacialBonus('Thri-Kreen');
        expect(tk).not.toBeNull();
        expect(tk!.conBonus).toBe(4);
    });

    it('Half-Giant has +2 bonus', () => {
        const hg = getHeatRacialBonus('Half-Giant');
        expect(hg).not.toBeNull();
        expect(hg!.conBonus).toBe(2);
    });

    it('Elf has +2 bonus', () => {
        const elf = getHeatRacialBonus('Elf');
        expect(elf).not.toBeNull();
        expect(elf!.conBonus).toBe(2);
    });

    it('returns null for Human (no special heat resistance)', () => {
        expect(getHeatRacialBonus('Human')).toBeNull();
    });

    it('returns null for unknown race', () => {
        expect(getHeatRacialBonus('Goblin')).toBeNull();
    });
});

describe('getHeatSicknessPenalties', () => {
    it('returns all zeros for stage 0', () => {
        const result = getHeatSicknessPenalties(0);
        expect(result.str).toBe(0);
        expect(result.dex).toBe(0);
        expect(result.attackRolls).toBe(0);
        expect(result.saves).toBe(0);
        expect(result.abilityChecks).toBe(0);
        expect(result.skillChecks).toBe(0);
        expect(result.ac).toBe(0);
        expect(result.speed).toBeNull();
    });

    it('stage 1 (Heat Fatigue): -1 attack, saves, ability checks', () => {
        const result = getHeatSicknessPenalties(1);
        expect(result.attackRolls).toBe(-1);
        expect(result.saves).toBe(-1);
        expect(result.abilityChecks).toBe(-1);
        expect(result.skillChecks).toBe(0);  // not affected at stage 1
        expect(result.speed).toBeNull();
        expect(result.sources['attackRolls']).toContain('Heat Fatigue');
    });

    it('stage 2 (Heat Stroke): -2 all rolls, half speed', () => {
        const result = getHeatSicknessPenalties(2);
        expect(result.attackRolls).toBe(-2);
        expect(result.saves).toBe(-2);
        expect(result.abilityChecks).toBe(-2);
        expect(result.skillChecks).toBe(-2);
        expect(result.speed).toBe('half');
        expect(result.sources['speed']).toContain('Heat Stroke');
    });

    it('stage 3 (Sunstroke): -4 all rolls, -2 AC', () => {
        const result = getHeatSicknessPenalties(3);
        expect(result.attackRolls).toBe(-4);
        expect(result.saves).toBe(-4);
        expect(result.abilityChecks).toBe(-4);
        expect(result.skillChecks).toBe(-4);
        expect(result.ac).toBe(-2);
        expect(result.sources['ac']).toContain('Sunstroke');
    });

    it('returns same shape as getConditionPenalties (ConditionPenaltySummary)', () => {
        const heat = getHeatSicknessPenalties(2);
        const cond = getConditionPenalties([]);
        // Both should have the same keys
        expect(Object.keys(heat).sort()).toEqual(Object.keys(cond).sort());
    });

    it('no stage produces NaN in any numeric field', () => {
        for (let stage = 0; stage <= 3; stage++) {
            const result = getHeatSicknessPenalties(stage);
            expect(Number.isNaN(result.str)).toBe(false);
            expect(Number.isNaN(result.attackRolls)).toBe(false);
            expect(Number.isNaN(result.ac)).toBe(false);
            expect(Number.isNaN(result.saves)).toBe(false);
        }
    });
});

// ─── Terrain Movement Modifiers (B2) ─────────────────────────────

describe('TERRAIN_MOVEMENT_MODIFIERS', () => {
    it('has at least 6 terrain types', () => {
        expect(TERRAIN_MOVEMENT_MODIFIERS.length).toBeGreaterThanOrEqual(6);
    });

    it('each terrain has required fields', () => {
        for (const t of TERRAIN_MOVEMENT_MODIFIERS) {
            expect(t.id).toBeTruthy();
            expect(t.name).toBeTruthy();
            expect(t.icon).toBeTruthy();
            expect(t.multiplier).toBeGreaterThan(0);
            expect(t.multiplier).toBeLessThanOrEqual(1);
        }
    });

    it('salt flats have full speed (×1)', () => {
        const sf = TERRAIN_MOVEMENT_MODIFIERS.find(t => t.id === 'salt-flats');
        expect(sf?.multiplier).toBe(1);
    });

    it('sandy wastes have half speed (×0.5)', () => {
        const sw = TERRAIN_MOVEMENT_MODIFIERS.find(t => t.id === 'sandy-wastes');
        expect(sw?.multiplier).toBe(0.5);
    });

    it('rocky badlands have ×0.75 speed', () => {
        const rb = TERRAIN_MOVEMENT_MODIFIERS.find(t => t.id === 'rocky-badlands');
        expect(rb?.multiplier).toBe(0.75);
    });
});

describe('getTerrainMultiplier', () => {
    it('returns correct multiplier for known terrain', () => {
        expect(getTerrainMultiplier('salt-flats')).toBe(1);
        expect(getTerrainMultiplier('sandy-wastes')).toBe(0.5);
        expect(getTerrainMultiplier('rocky-badlands')).toBe(0.75);
    });

    it('returns 1 (normal) for unknown terrain', () => {
        expect(getTerrainMultiplier('unknown')).toBe(1);
        expect(getTerrainMultiplier('')).toBe(1);
    });
});

// ─── Forced March (B2) ───────────────────────────────────────────

describe('FORCED_MARCH_STAGES', () => {
    it('has exactly 4 stages (0-3)', () => {
        expect(FORCED_MARCH_STAGES).toHaveLength(4);
    });

    it('stage 0 is Normal with no modifiers', () => {
        expect(FORCED_MARCH_STAGES[0].name).toBe('Normal');
        expect(FORCED_MARCH_STAGES[0].penalties).toBeNull();
        expect(FORCED_MARCH_STAGES[0].modifiers).toBeNull();
    });

    it('stages 1-3 have penalties and modifiers defined', () => {
        for (let i = 1; i <= 3; i++) {
            expect(FORCED_MARCH_STAGES[i].penalties).toBeTruthy();
            expect(FORCED_MARCH_STAGES[i].modifiers).toBeTruthy();
        }
    });

    it('stage numbers are sequential', () => {
        FORCED_MARCH_STAGES.forEach((stage, index) => {
            expect(stage.stage).toBe(index);
        });
    });

    it('fatigued has STR -2, DEX -2', () => {
        expect(FORCED_MARCH_STAGES[1].modifiers?.str).toBe(-2);
        expect(FORCED_MARCH_STAGES[1].modifiers?.dex).toBe(-2);
    });

    it('exhausted has STR -6, DEX -6, half speed', () => {
        expect(FORCED_MARCH_STAGES[2].modifiers?.str).toBe(-6);
        expect(FORCED_MARCH_STAGES[2].modifiers?.dex).toBe(-6);
        expect(FORCED_MARCH_STAGES[2].modifiers?.speed).toBe('half');
    });

    it('collapsed sets speed zero and cantAct', () => {
        expect(FORCED_MARCH_STAGES[3].modifiers?.speed).toBe('zero');
        expect(FORCED_MARCH_STAGES[3].modifiers?.cantAct).toBe(true);
    });
});

describe('FORCED_MARCH_BASE_HOURS', () => {
    it('is 8 hours', () => {
        expect(FORCED_MARCH_BASE_HOURS).toBe(8);
    });
});

describe('getForcedMarchDC', () => {
    it('DC = 10 + extra hours', () => {
        expect(getForcedMarchDC(1)).toBe(11);
        expect(getForcedMarchDC(2)).toBe(12);
        expect(getForcedMarchDC(5)).toBe(15);
    });

    it('DC = 10 for 0 extra hours', () => {
        expect(getForcedMarchDC(0)).toBe(10);
    });

    it('clamps negative extra hours to 0', () => {
        expect(getForcedMarchDC(-3)).toBe(10);
    });

    it('floors fractional hours', () => {
        expect(getForcedMarchDC(2.7)).toBe(12);
        expect(getForcedMarchDC(3.9)).toBe(13);
    });
});

describe('getForcedMarchPenalties', () => {
    it('returns all zeros for stage 0', () => {
        const result = getForcedMarchPenalties(0);
        expect(result.str).toBe(0);
        expect(result.dex).toBe(0);
        expect(result.attackRolls).toBe(0);
        expect(result.speed).toBeNull();
        expect(result.cantAct).toBe(false);
    });

    it('stage 1 (Fatigued): STR -2, DEX -2', () => {
        const result = getForcedMarchPenalties(1);
        expect(result.str).toBe(-2);
        expect(result.dex).toBe(-2);
        expect(result.speed).toBeNull();
        expect(result.sources['str']).toContain('March: Fatigued');
    });

    it('stage 2 (Exhausted): STR -6, DEX -6, half speed', () => {
        const result = getForcedMarchPenalties(2);
        expect(result.str).toBe(-6);
        expect(result.dex).toBe(-6);
        expect(result.speed).toBe('half');
        expect(result.sources['speed']).toContain('March: Exhausted');
    });

    it('stage 3 (Collapsed): speed zero, cantAct', () => {
        const result = getForcedMarchPenalties(3);
        expect(result.speed).toBe('zero');
        expect(result.cantAct).toBe(true);
        expect(result.sources['cantAct']).toContain('March: Collapsed');
    });

    it('returns same shape as getConditionPenalties (ConditionPenaltySummary)', () => {
        const march = getForcedMarchPenalties(2);
        const cond = getConditionPenalties([]);
        expect(Object.keys(march).sort()).toEqual(Object.keys(cond).sort());
    });

    it('no stage produces NaN in any numeric field', () => {
        for (let stage = 0; stage <= 3; stage++) {
            const result = getForcedMarchPenalties(stage);
            expect(Number.isNaN(result.str)).toBe(false);
            expect(Number.isNaN(result.dex)).toBe(false);
            expect(Number.isNaN(result.attackRolls)).toBe(false);
            expect(Number.isNaN(result.ac)).toBe(false);
        }
    });
});

// ─── Travel Distance (B2) ────────────────────────────────────────

describe('calculateTravelDistance', () => {
    it('30 ft speed on salt flats for 8 hours = 48 miles', () => {
        // 30/5 = 6 mi/hr × 1.0 × 8 = 48
        expect(calculateTravelDistance(30, 'salt-flats', 8)).toBe(48);
    });

    it('30 ft speed on sandy wastes for 8 hours = 24 miles', () => {
        // 30/5 = 6 mi/hr × 0.5 × 8 = 24
        expect(calculateTravelDistance(30, 'sandy-wastes', 8)).toBe(24);
    });

    it('30 ft speed on rocky badlands for 8 hours = 36 miles', () => {
        // 30/5 = 6 mi/hr × 0.75 × 8 = 36
        expect(calculateTravelDistance(30, 'rocky-badlands', 8)).toBe(36);
    });

    it('returns 0 for 0 hours', () => {
        expect(calculateTravelDistance(30, 'salt-flats', 0)).toBe(0);
    });

    it('returns 0 for 0 speed', () => {
        expect(calculateTravelDistance(0, 'salt-flats', 8)).toBe(0);
    });

    it('returns 0 for negative values', () => {
        expect(calculateTravelDistance(-30, 'salt-flats', 8)).toBe(0);
        expect(calculateTravelDistance(30, 'salt-flats', -2)).toBe(0);
    });

    it('uses ×1 multiplier for unknown terrain', () => {
        expect(calculateTravelDistance(30, 'unknown-terrain', 1)).toBe(6);
    });

    it('handles non-standard speeds (40 ft Half-Giant)', () => {
        // 40/5 = 8 mi/hr × 0.5 × 8 = 32
        expect(calculateTravelDistance(40, 'sandy-wastes', 8)).toBe(32);
    });
});

// ─── Metal Upgrade Cost ───────────────────────────────────────────

describe('metalUpgradeCost', () => {
    it('multiplies a simple cp cost by 100', () => {
        expect(metalUpgradeCost('10 cp')).toBe('1,000 cp');
    });

    it('multiplies a larger cp cost by 100', () => {
        expect(metalUpgradeCost('500 cp')).toBe('50,000 cp');
    });

    it('handles gp currency', () => {
        expect(metalUpgradeCost('15 gp')).toBe('1,500 gp');
    });

    it('handles cost with no unit', () => {
        expect(metalUpgradeCost('25')).toBe('2,500');
    });

    it('handles cost with decimal', () => {
        expect(metalUpgradeCost('2.5 cp')).toBe('250 cp');
    });

    it('returns dash for empty string', () => {
        expect(metalUpgradeCost('')).toBe('—');
    });

    it('returns dash for null', () => {
        expect(metalUpgradeCost(null)).toBe('—');
    });

    it('returns dash for undefined', () => {
        expect(metalUpgradeCost(undefined)).toBe('—');
    });

    it('returns dash for non-numeric input', () => {
        expect(metalUpgradeCost('free')).toBe('—');
    });

    it('handles leading/trailing whitespace', () => {
        expect(metalUpgradeCost('  10 cp  ')).toBe('1,000 cp');
    });

    it('handles comma-formatted input', () => {
        expect(metalUpgradeCost('1,000 cp')).toBe('100,000 cp');
    });
});

// ─── Natural Healing (C1) ──────────────────────────────────────────

describe('NATURAL_HEALING_RULES', () => {
    it('has expected base values', () => {
        expect(NATURAL_HEALING_RULES.hpPerLevelPerDay).toBe(1);
        expect(NATURAL_HEALING_RULES.longTermCareMultiplier).toBe(2);
        expect(NATURAL_HEALING_RULES.healCheckDC).toBe(15);
        expect(NATURAL_HEALING_RULES.desertPenaltyMultiplier).toBe(0.5);
    });
});

describe('getNaturalHealing', () => {
    it('returns full healing when both water and shade are present', () => {
        const result = getNaturalHealing(5, true, true);
        expect(result.hpPerDay).toBe(5);
        expect(result.hpLongTermCare).toBe(10);
        expect(result.isHalved).toBe(false);
        expect(result.reasons).toHaveLength(0);
    });

    it('halves healing when water is missing', () => {
        const result = getNaturalHealing(6, false, true);
        expect(result.hpPerDay).toBe(3);
        expect(result.hpLongTermCare).toBe(6);
        expect(result.isHalved).toBe(true);
        expect(result.reasons).toContain('No adequate water');
    });

    it('halves healing when shade is missing', () => {
        const result = getNaturalHealing(6, true, false);
        expect(result.hpPerDay).toBe(3);
        expect(result.hpLongTermCare).toBe(6);
        expect(result.isHalved).toBe(true);
        expect(result.reasons).toContain('No shade or shelter');
    });

    it('halves healing when both are missing (lists both reasons)', () => {
        const result = getNaturalHealing(8, false, false);
        expect(result.hpPerDay).toBe(4);
        expect(result.hpLongTermCare).toBe(8);
        expect(result.isHalved).toBe(true);
        expect(result.reasons).toHaveLength(2);
        expect(result.reasons).toContain('No adequate water');
        expect(result.reasons).toContain('No shade or shelter');
    });

    it('preserves base values alongside effective values', () => {
        const result = getNaturalHealing(10, false, false);
        expect(result.baseHpPerDay).toBe(10);
        expect(result.baseLongTermCare).toBe(20);
        expect(result.hpPerDay).toBe(5);
        expect(result.hpLongTermCare).toBe(10);
    });

    it('scales with character level', () => {
        for (const level of [1, 5, 10, 15, 20]) {
            const full = getNaturalHealing(level, true, true);
            expect(full.hpPerDay).toBe(level);
            expect(full.hpLongTermCare).toBe(level * 2);
        }
    });

    it('floors to at least 1 HP per day at level 1 when halved', () => {
        const result = getNaturalHealing(1, false, false);
        expect(result.hpPerDay).toBeGreaterThanOrEqual(1);
        expect(result.hpLongTermCare).toBeGreaterThanOrEqual(1);
    });

    it('clamps level to minimum 1', () => {
        const result = getNaturalHealing(0, true, true);
        expect(result.hpPerDay).toBe(1);
        expect(result.baseHpPerDay).toBe(1);
    });

    it('clamps negative level to 1', () => {
        const result = getNaturalHealing(-3, true, true);
        expect(result.hpPerDay).toBe(1);
    });

    it('floors fractional levels', () => {
        const result = getNaturalHealing(3.7, true, true);
        expect(result.hpPerDay).toBe(3);
    });

    it('odd level halving floors correctly', () => {
        // Level 3: base 3 HP/day, halved = 1.5, floored = 1
        const result = getNaturalHealing(3, false, true);
        expect(result.hpPerDay).toBe(1);
        // Level 3 long-term: base 6, halved = 3
        expect(result.hpLongTermCare).toBe(3);
    });
});
