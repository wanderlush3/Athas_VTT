import { describe, it, expect } from 'vitest';
import { SKILLS_3_5E } from '../skills';
import { maxSkillRank } from '../gameConstants';

// ─── SKILLS_3_5E Data Integrity ───────────────────────────────────

describe('SKILLS_3_5E', () => {
    it('contains 41 skills', () => {
        expect(SKILLS_3_5E).toHaveLength(41);
    });

    it('every skill has a name, ability, and trainedOnly flag', () => {
        for (const skill of SKILLS_3_5E) {
            expect(skill.name).toBeTruthy();
            expect(skill.ability).toBeTruthy();
            expect(typeof skill.trainedOnly).toBe('boolean');
        }
    });

    it('all ability associations are valid 3-letter abbreviations', () => {
        const valid = new Set(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
        for (const skill of SKILLS_3_5E) {
            expect(valid).toContain(skill.ability);
        }
    });

    it('has no duplicate skill names', () => {
        const names = SKILLS_3_5E.map(s => s.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('includes expected trained-only skills', () => {
        const trainedOnly = SKILLS_3_5E.filter(s => s.trainedOnly).map(s => s.name);
        const expectedTrained = [
            'Decipher Script', 'Disable Device', 'Handle Animal',
            'Open Lock', 'Psicraft', 'Sleight of Hand', 'Spellcraft', 'Tumble',
            'Use Magic Device',
        ];
        for (const name of expectedTrained) {
            expect(trainedOnly).toContain(name);
        }
    });

    it('includes expected untrained skills', () => {
        const untrained = SKILLS_3_5E.filter(s => !s.trainedOnly).map(s => s.name);
        const expected = ['Climb', 'Swim', 'Jump', 'Listen', 'Spot', 'Search', 'Heal'];
        for (const name of expected) {
            expect(untrained).toContain(name);
        }
    });

    it('includes Athas-specific skills', () => {
        const names = SKILLS_3_5E.map(s => s.name);
        expect(names).toContain('Knowledge (Psionics)');
        expect(names).toContain('Knowledge (Warcraft)');
        expect(names).toContain('Psicraft');
    });
});

// ─── Skill Rank Limits ────────────────────────────────────────────

describe('maxSkillRank — class vs cross-class', () => {
    it.each([
        { level: 1, classSkill: true, expected: 4 },
        { level: 1, classSkill: false, expected: 2 },
        { level: 5, classSkill: true, expected: 8 },
        { level: 5, classSkill: false, expected: 4 },
        { level: 10, classSkill: true, expected: 13 },
        { level: 10, classSkill: false, expected: 6 },
        { level: 20, classSkill: true, expected: 23 },
        { level: 20, classSkill: false, expected: 11 },
    ])('level $level, classSkill=$classSkill → $expected', ({ level, classSkill, expected }) => {
        expect(maxSkillRank(level, classSkill)).toBe(expected);
    });

    it('cross-class cap is always ≤ half of class skill cap', () => {
        for (let level = 1; level <= 20; level++) {
            const classCap = maxSkillRank(level, true);
            const crossCap = maxSkillRank(level, false);
            expect(crossCap).toBeLessThanOrEqual(Math.ceil(classCap / 2));
        }
    });
});
