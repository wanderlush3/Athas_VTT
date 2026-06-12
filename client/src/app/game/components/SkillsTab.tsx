'use client';

import React, { useEffect } from 'react';
import { SKILLS_3_5E } from 'athas-shared';

interface SkillsTabProps {
    skills: any[];
    char: any;
    onSkillsChange: (skills: any[]) => void;
    readOnly?: boolean;
}

export function SkillsTab({ skills, char, onSkillsChange, readOnly }: SkillsTabProps) {
    // Map ability abbreviation to character stat key
    const abilityKeyMap: Record<string, string> = {
        'STR': 'strength', 'DEX': 'dexterity', 'CON': 'constitution',
        'INT': 'intelligence', 'WIS': 'wisdom', 'CHA': 'charisma',
    };

    const getAbilityMod = (ability: string): number => {
        const key = abilityKeyMap[ability];
        return key ? Math.floor((char[key] - 10) / 2) : 0;
    };

    // Initialize skills from master list if empty
    const currentSkills: any[] = (skills && skills.length > 0) ? skills : SKILLS_3_5E.map(s => ({
        name: s.name,
        ranks: 0,
        modifier: getAbilityMod(s.ability),
        abilityMod: s.ability,
        classSkill: false,
        trainedOnly: s.trainedOnly,
    }));

    const handleRankChange = (index: number, value: number) => {
        if (readOnly) return;
        const updated = [...currentSkills];
        const ranks = Math.max(0, value);
        updated[index] = {
            ...updated[index],
            ranks,
            modifier: ranks + getAbilityMod(updated[index].abilityMod),
        };
        onSkillsChange(updated);
    };

    const toggleClassSkill = (index: number) => {
        if (readOnly) return;
        const updated = [...currentSkills];
        updated[index] = { ...updated[index], classSkill: !updated[index].classSkill };
        onSkillsChange(updated);
    };

    // If skills were never initialized, persist them on mount
    useEffect(() => {
        if (!skills || skills.length === 0) {
            onSkillsChange(currentSkills);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center gap-1 px-1 py-0.5 text-xs text-obsidian-500 uppercase tracking-wider border-b border-obsidian-700">
                <span className="w-4 text-center">CS</span>
                <span className="flex-1">Skill</span>
                <span className="w-8 text-center">Abi</span>
                <span className="w-10 text-center">Ranks</span>
                <span className="w-10 text-center">Mod</span>
            </div>
            {/* Skill rows */}
            {currentSkills.map((skill: any, index: number) => {
                const abilMod = getAbilityMod(skill.abilityMod);
                const totalMod = skill.ranks + abilMod;
                const isUsable = !skill.trainedOnly || skill.ranks > 0;
                return (
                    <div
                        key={skill.name}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded-sm text-[11px] hover:bg-obsidian-800/50 transition-colors ${!isUsable ? 'opacity-40' : ''}`}
                    >
                        {/* Class skill toggle */}
                        <button
                            onClick={() => toggleClassSkill(index)}
                            disabled={readOnly}
                            className={`w-4 h-4 flex items-center justify-center shrink-0 text-xs transition-colors ${
                                skill.classSkill ? 'text-sand-400' : 'text-obsidian-600'
                            }`}
                            title={skill.classSkill ? 'Class skill' : 'Cross-class skill'}
                        >
                            {skill.classSkill ? '●' : '○'}
                        </button>
                        {/* Skill name */}
                        <span className={`flex-1 truncate ${skill.classSkill ? 'text-sand-300' : 'text-obsidian-300'}`}>
                            {skill.name}
                            {skill.trainedOnly && <span className="text-obsidian-600 ml-0.5">✦</span>}
                        </span>
                        {/* Ability */}
                        <span className="w-8 text-center text-obsidian-500 text-xs font-mono">
                            {skill.abilityMod}
                        </span>
                        {/* Ranks */}
                        <input
                            type="number"
                            min={0}
                            value={skill.ranks}
                            onChange={(e) => handleRankChange(index, parseInt(e.target.value) || 0)}
                            readOnly={readOnly}
                            className="w-10 px-1 py-0 bg-obsidian-800 border border-obsidian-700 rounded-sm text-[11px] text-sand-200 text-center focus:outline-none focus:border-sand-500"
                        />
                        {/* Total modifier */}
                        <span className={`w-10 text-center font-mono text-[11px] font-bold ${
                            totalMod > 0 ? 'text-sand-400' : totalMod < 0 ? 'text-crimson-light' : 'text-obsidian-400'
                        }`}>
                            {totalMod >= 0 ? `+${totalMod}` : totalMod}
                        </span>
                    </div>
                );
            })}
            {/* Legend */}
            <div className="pt-1 border-t border-obsidian-700/50 flex gap-3 text-xs text-obsidian-600 px-1">
                <span>● = class skill</span>
                <span>✦ = trained only</span>
            </div>
        </div>
    );
}
