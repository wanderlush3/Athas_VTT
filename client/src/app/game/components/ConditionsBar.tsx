'use client';

import React from 'react';
import { CONDITIONS_3_5E } from 'athas-shared';
import type { ConditionModifiers } from 'athas-shared';

const CONDITION_HEX: Record<string, string> = {
    gray: '#9ca3af', purple: '#a855f7', yellow: '#eab308', amber: '#f59e0b',
    green: '#22c55e', orange: '#f97316', indigo: '#6366f1', red: '#ef4444',
    sky: '#0ea5e9', stone: '#78716c', violet: '#8b5cf6', lime: '#84cc16',
};

/** Build a concise modifier summary string for tooltip/display */
function modifierSummary(mods?: ConditionModifiers): string {
    if (!mods) return '';
    const parts: string[] = [];
    if (mods.str) parts.push(`STR ${mods.str > 0 ? '+' : ''}${mods.str}`);
    if (mods.dex) parts.push(`DEX ${mods.dex > 0 ? '+' : ''}${mods.dex}`);
    if (mods.attackRolls) parts.push(`Atk ${mods.attackRolls > 0 ? '+' : ''}${mods.attackRolls}`);
    if (mods.damage) parts.push(`Dmg ${mods.damage > 0 ? '+' : ''}${mods.damage}`);
    if (mods.ac) parts.push(`AC ${mods.ac}`);
    if (mods.saves) parts.push(`Saves ${mods.saves}`);
    if (mods.skillChecks) parts.push(`Skills ${mods.skillChecks}`);
    if (mods.initiative) parts.push(`Init ${mods.initiative}`);
    if (mods.speed === 'half') parts.push('½ Speed');
    if (mods.speed === 'zero') parts.push('No Speed');
    if (mods.loseDexToAC) parts.push('No DEX→AC');
    if (mods.effectiveDex0) parts.push('DEX→0');
    if (mods.effectiveStr0) parts.push('STR→0');
    if (mods.cantAct) parts.push('Can\'t Act');
    return parts.join(', ');
}

interface ConditionsBarProps {
    conditions: string[];
    syncField: (field: string, value: any) => void;
    readOnly?: boolean;
}

export function ConditionsBar({ conditions, syncField, readOnly }: ConditionsBarProps) {
    const toggleCondition = (condId: string) => {
        if (readOnly) return;
        const updated = conditions.includes(condId)
            ? conditions.filter((c: string) => c !== condId)
            : [...conditions, condId];
        syncField('conditions', updated);
    };

    return (
        <div className="px-3 py-1.5 border-b border-obsidian-700">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">Conditions</span>
                {conditions.length > 0 && (
                    <span className="text-xs text-obsidian-400 font-mono">{conditions.length} active</span>
                )}
            </div>
            <div className="flex flex-wrap gap-1">
                {CONDITIONS_3_5E.map((cond: any) => {
                    const isActive = conditions.includes(cond.id);
                    const hex = CONDITION_HEX[cond.color] || '#9ca3af';
                    const summary = isActive ? modifierSummary(cond.modifiers) : '';
                    const tooltip = isActive
                        ? [cond.name, summary, cond.modifiers?.notes].filter(Boolean).join(' — ')
                        : cond.name;
                    return (
                        <button
                            key={cond.id}
                            onClick={() => toggleCondition(cond.id)}
                            disabled={readOnly}
                            aria-pressed={isActive}
                            aria-label={cond.name}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-xs border transition-all duration-200 ${
                                isActive
                                    ? ''
                                    : 'bg-obsidian-800/50 border-obsidian-700/50 text-obsidian-600 hover:text-obsidian-400 hover:border-obsidian-600'
                            }`}
                            style={isActive ? {
                                backgroundColor: `${hex}20`,
                                borderColor: `${hex}66`,
                                color: hex,
                            } : undefined}
                            title={tooltip}
                        >
                            <span>{cond.icon}</span>
                            {isActive && (
                                <span>
                                    {cond.name}
                                    {summary && <span className="ml-1 opacity-70 text-xs">({summary})</span>}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
