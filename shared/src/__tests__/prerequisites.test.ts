import { describe, it, expect } from 'vitest';
import { checkFeatPrerequisites, checkSpellEligibility } from '../gameConstants';
import type { StructuredPrereqs, CharacterPrereqData } from '../types';

// ─── Helper: base character factory ───────────────────────────────

function makeCharacter(overrides: Partial<CharacterPrereqData> = {}): CharacterPrereqData {
    return {
        strength: 10, dexterity: 10, constitution: 10,
        intelligence: 10, wisdom: 10, charisma: 10,
        feats: [],
        baseAttackBonus: 0,
        classLevels: [],
        level: 1,
        skills: [],
        ...overrides,
    };
}

// ─── checkFeatPrerequisites ───────────────────────────────────────

describe('checkFeatPrerequisites', () => {
    it('returns met: true when prereqs is undefined', () => {
        const result = checkFeatPrerequisites(undefined, makeCharacter());
        expect(result.met).toBe(true);
        expect(result.details).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    describe('ability score requirements', () => {
        const prereqs: StructuredPrereqs = {
            abilityScores: [{ ability: 'strength', minimum: 13 }],
        };

        it('met when score >= minimum', () => {
            const char = makeCharacter({ strength: 15 });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(true);
            expect(result.details[0].met).toBe(true);
        });

        it('met when score == minimum', () => {
            const char = makeCharacter({ strength: 13 });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(true);
        });

        it('unmet when score < minimum', () => {
            const char = makeCharacter({ strength: 10 });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(false);
            expect(result.details[0].met).toBe(false);
        });

        it('handles short-form ability names (str, dex)', () => {
            const strPrereq: StructuredPrereqs = {
                abilityScores: [{ ability: 'str', minimum: 13 }],
            };
            const result = checkFeatPrerequisites(strPrereq, makeCharacter({ strength: 15 }));
            expect(result.met).toBe(true);
        });
    });

    describe('feat requirements', () => {
        const prereqs: StructuredPrereqs = {
            feats: ['Power Attack'],
        };

        it('met when character has the feat', () => {
            const char = makeCharacter({ feats: [{ name: 'Power Attack' }] });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(true);
        });

        it('case-insensitive matching', () => {
            const char = makeCharacter({ feats: [{ name: 'power attack' }] });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(true);
        });

        it('unmet when character lacks the feat', () => {
            const char = makeCharacter({ feats: [] });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(false);
        });
    });

    describe('BAB requirement', () => {
        const prereqs: StructuredPrereqs = { bab: 6 };

        it('met when BAB >= requirement', () => {
            const result = checkFeatPrerequisites(prereqs, makeCharacter({ baseAttackBonus: 8 }));
            expect(result.met).toBe(true);
        });

        it('unmet when BAB < requirement', () => {
            const result = checkFeatPrerequisites(prereqs, makeCharacter({ baseAttackBonus: 3 }));
            expect(result.met).toBe(false);
        });
    });

    describe('class level requirements', () => {
        const prereqs: StructuredPrereqs = {
            classLevels: [{ className: 'Fighter', level: 4 }],
        };

        it('met when class level is sufficient', () => {
            const char = makeCharacter({
                classLevels: [{ className: 'Fighter', level: 5 }],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(true);
        });

        it('unmet when class level is too low', () => {
            const char = makeCharacter({
                classLevels: [{ className: 'Fighter', level: 2 }],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(false);
        });

        it('unmet when character has different class', () => {
            const char = makeCharacter({
                classLevels: [{ className: 'Rogue', level: 10 }],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(false);
        });
    });

    describe('character level requirement', () => {
        const prereqs: StructuredPrereqs = { characterLevel: 6 };

        it('met when level >= requirement', () => {
            const result = checkFeatPrerequisites(prereqs, makeCharacter({ level: 8 }));
            expect(result.met).toBe(true);
        });

        it('unmet when level < requirement', () => {
            const result = checkFeatPrerequisites(prereqs, makeCharacter({ level: 3 }));
            expect(result.met).toBe(false);
        });
    });

    describe('caster level requirement', () => {
        const prereqs: StructuredPrereqs = { casterLevel: 3 };

        it('met when caster class levels total >= requirement', () => {
            const char = makeCharacter({
                classLevels: [
                    { className: 'Cleric', level: 2 },
                    { className: 'Druid', level: 1 },
                ],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(true);
        });

        it('unmet when non-caster classes only', () => {
            const char = makeCharacter({
                classLevels: [{ className: 'Fighter', level: 10 }],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(false);
        });

        it('counts Defiler and Preserver as casters', () => {
            const charDefiler = makeCharacter({
                classLevels: [{ className: 'Defiler', level: 5 }],
            });
            const charPreserver = makeCharacter({
                classLevels: [{ className: 'Preserver', level: 3 }],
            });
            expect(checkFeatPrerequisites(prereqs, charDefiler).met).toBe(true);
            expect(checkFeatPrerequisites(prereqs, charPreserver).met).toBe(true);
        });
    });

    describe('skill rank requirements', () => {
        const prereqs: StructuredPrereqs = {
            skillRanks: [{ skill: 'Ride', ranks: 5 }],
        };

        it('met when skill ranks >= requirement', () => {
            const char = makeCharacter({
                skills: [{ name: 'Ride', ranks: 7 }],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(true);
        });

        it('unmet when skill ranks < requirement', () => {
            const char = makeCharacter({
                skills: [{ name: 'Ride', ranks: 2 }],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(false);
        });

        it('unmet when skill is missing entirely', () => {
            const result = checkFeatPrerequisites(prereqs, makeCharacter());
            expect(result.met).toBe(false);
        });
    });

    describe('special / warnings', () => {
        it('passes special notes through as warnings', () => {
            const prereqs: StructuredPrereqs = {
                special: ['Must have wild shape ability', 'Requires DM approval'],
            };
            const result = checkFeatPrerequisites(prereqs, makeCharacter());
            expect(result.met).toBe(true); // specials don't block
            expect(result.warnings).toEqual([
                'Must have wild shape ability',
                'Requires DM approval',
            ]);
        });
    });

    describe('combined prerequisites', () => {
        it('requires ALL conditions to be met', () => {
            const prereqs: StructuredPrereqs = {
                abilityScores: [{ ability: 'dexterity', minimum: 13 }],
                bab: 1,
                feats: ['Dodge'],
            };

            // Has DEX and BAB but not the feat
            const char = makeCharacter({
                dexterity: 15,
                baseAttackBonus: 3,
                feats: [],
            });
            const result = checkFeatPrerequisites(prereqs, char);
            expect(result.met).toBe(false);
            // DEX and BAB details should be met, feat should not
            const dexDetail = result.details.find(d => d.label.startsWith('DEX'));
            const babDetail = result.details.find(d => d.label.startsWith('BAB'));
            const featDetail = result.details.find(d => d.label === 'Dodge');
            expect(dexDetail?.met).toBe(true);
            expect(babDetail?.met).toBe(true);
            expect(featDetail?.met).toBe(false);
        });
    });
});

// ─── checkSpellEligibility ────────────────────────────────────────

describe('checkSpellEligibility', () => {
    it('eligible when character class matches and spell level is within range', () => {
        const spell = { level: 3, classes: ['Cleric', 'Druid'] };
        const classLevels = [{ className: 'Cleric', level: 5 }];
        const maxSpellLevel = { Cleric: 3 };
        const result = checkSpellEligibility(spell, classLevels, maxSpellLevel);
        expect(result.eligible).toBe(true);
        expect(result.reasons).toHaveLength(0);
    });

    it('ineligible when character has no matching class', () => {
        const spell = { level: 1, classes: ['Cleric'] };
        const classLevels = [{ className: 'Fighter', level: 10 }];
        const result = checkSpellEligibility(spell, classLevels, {});
        expect(result.eligible).toBe(false);
        expect(result.reasons[0]).toContain('Requires class');
    });

    it('ineligible when spell level exceeds max castable', () => {
        const spell = { level: 5, classes: ['Preserver'] };
        const classLevels = [{ className: 'Preserver', level: 3 }];
        const maxSpellLevel = { Preserver: 2 };
        const result = checkSpellEligibility(spell, classLevels, maxSpellLevel);
        expect(result.eligible).toBe(false);
        expect(result.reasons[0]).toContain('exceeds current ability');
    });

    it('eligible if ANY matching class can cast the spell', () => {
        const spell = { level: 3, classes: ['Cleric', 'Druid'] };
        const classLevels = [
            { className: 'Cleric', level: 2 },
            { className: 'Druid', level: 7 },
        ];
        // Cleric can only cast up to level 1, but Druid can cast up to level 4
        const maxSpellLevel = { Cleric: 1, Druid: 4 };
        const result = checkSpellEligibility(spell, classLevels, maxSpellLevel);
        expect(result.eligible).toBe(true);
    });

    it('ineligible when class matches but no maxSpellLevel data', () => {
        const spell = { level: 1, classes: ['Templar'] };
        const classLevels = [{ className: 'Templar', level: 3 }];
        const maxSpellLevel = {}; // no data for Templar
        const result = checkSpellEligibility(spell, classLevels, maxSpellLevel);
        expect(result.eligible).toBe(false);
    });
});
