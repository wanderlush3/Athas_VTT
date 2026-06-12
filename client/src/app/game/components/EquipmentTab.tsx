'use client';

import React, { useState } from 'react';
import { getCarryCapacity, getLoadCategory, getBreakageDC } from 'athas-shared';
import type { EquipmentItem } from 'athas-shared';

interface EquipmentTabProps {
    equipment: EquipmentItem[];
    char: any;
    onEquipmentChange: (equipment: EquipmentItem[]) => void;
    onRemoveItem: (index: number) => void;
    onBreakageCheck?: (item: EquipmentItem, index: number) => void;
    readOnly?: boolean;
}

export function EquipmentTab({ equipment, char, onEquipmentChange, onRemoveItem, onBreakageCheck, readOnly }: EquipmentTabProps) {
    const [expandedItem, setExpandedItem] = useState<number | null>(null);

    const toggleBroken = (index: number) => {
        if (readOnly) return;
        const updated = [...equipment];
        updated[index] = { ...updated[index], broken: !updated[index].broken };
        onEquipmentChange(updated);
    };

    // ── Encumbrance Bar ──
    const encumbranceBar = (() => {
        const equipWeight = (equipment || []).reduce((sum: number, item: any) => sum + (item.broken ? 0 : (item.weight || 0)), 0);
        const totalCoins = (char?.currencyCp || 0) + (char?.currencySp || 0) + (char?.currencyGp || 0) + (char?.currencyBits || 0);
        const coinWeight = Math.floor(totalCoins / 50);
        const totalWeight = equipWeight + coinWeight;

        const capacity = getCarryCapacity(char?.strength || 10);
        const loadCategory = getLoadCategory(char?.strength || 10, totalWeight);

        const barMax = capacity.heavy;
        const barPercent = barMax > 0 ? Math.min(100, (totalWeight / barMax) * 100) : 0;

        const colorClass = loadCategory === 'light' ? 'from-emerald-700 to-emerald-500'
            : loadCategory === 'medium' ? 'from-yellow-700 to-yellow-500'
            : loadCategory === 'heavy' ? 'from-orange-700 to-orange-500'
            : 'from-red-700 to-red-500';

        const labelColor = loadCategory === 'light' ? 'text-emerald-400'
            : loadCategory === 'medium' ? 'text-yellow-400'
            : loadCategory === 'heavy' ? 'text-orange-400'
            : 'text-red-400';

        return (
            <div className="px-1 pb-1.5 border-b border-obsidian-700 mb-1">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">Encumbrance</span>
                    <span className={`text-xs font-mono ${labelColor}`}>
                        {totalWeight} / {capacity.heavy} lb
                        <span className="text-obsidian-500 ml-1">({loadCategory})</span>
                    </span>
                </div>
                <div className="h-1.5 bg-obsidian-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={totalWeight} aria-valuemin={0} aria-valuemax={barMax} aria-label="Encumbrance">
                    <div
                        className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-300 ${
                            loadCategory === 'overloaded' ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${barPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-obsidian-600 mt-0.5 px-0.5">
                    <span>Light ≤{capacity.light}</span>
                    <span>Med ≤{capacity.medium}</span>
                    <span>Heavy ≤{capacity.heavy}</span>
                </div>
            </div>
        );
    })();

    if (!equipment || equipment.length === 0) {
        return (
            <>
                {encumbranceBar}
                <p className="text-xs text-obsidian-500 italic">No equipment</p>
            </>
        );
    }

    return (
        <>
        {encumbranceBar}
        <div className="space-y-1">
            {equipment.map((item: any, index: number) => {
                const hasPsionics = item.grantedPowers?.length > 0;
                const isExpanded = expandedItem === index;
                const dc = getBreakageDC(item.material || '');
                const isMetal = item.material?.toLowerCase() === 'metal';
                const isBreakable = (item.type === 'weapon' || item.type === 'armor' || item.type === 'shield') && dc !== null;
                return (
                    <div key={item.id || index}>
                        <div
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs ${
                                item.broken ? 'bg-crimson-dark/20 border border-crimson/30'
                                : hasPsionics ? 'bg-indigo-900/20 border border-indigo-700/30'
                                : isMetal ? 'bg-amber-900/15 border border-amber-500/30 shadow-[0_0_6px_rgba(245,158,11,0.15)]'
                                : 'bg-obsidian-800/50'
                            }`}
                        >
                            {/* Broken checkbox */}
                            <button
                                onClick={() => toggleBroken(index)}
                                disabled={readOnly}
                                className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${item.broken
                                    ? 'bg-crimson border-crimson-light text-sand-100'
                                    : 'border-obsidian-500 hover:border-sand-500'
                                    }`}
                                title={item.broken ? 'Broken — click to repair' : 'Click to mark as broken'}
                            >
                                {item.broken && <span className="text-sm">✕</span>}
                            </button>

                            {/* Item info */}
                            <button
                                className="flex-1 min-w-0 text-left"
                                onClick={() => hasPsionics ? setExpandedItem(isExpanded ? null : index) : undefined}
                            >
                                <div className={`flex justify-between ${item.broken ? 'line-through text-obsidian-500' : 'text-sand-300'}`}>
                                    <span className="truncate">
                                        {hasPsionics && <span className="mr-1">🔮</span>}
                                        {isMetal && !hasPsionics && <span className="mr-1">✨</span>}
                                        {item.name}
                                        {item.broken && <span className="ml-1 text-crimson-light no-underline font-display uppercase text-xs">BROKEN</span>}
                                    </span>
                                    {item.damage && <span className="text-obsidian-400 shrink-0 ml-1">{item.damage}</span>}
                                </div>
                                <span className={`text-sm ${item.broken ? 'text-obsidian-600' : 'text-obsidian-500'}`}>
                                    {item.material}{item.weight ? ` • ${item.weight} lb` : ''}
                                    {isBreakable && !item.broken && (
                                        <span className="text-amber-500/70 ml-1">• DC {dc}</span>
                                    )}
                                    {isMetal && (
                                        <span className="text-amber-400/70 ml-1">• Unbreakable</span>
                                    )}
                                    {hasPsionics && !item.broken && (
                                        <span className="text-indigo-400 ml-1">
                                            • {item.grantedPowers.length} power{item.grantedPowers.length > 1 ? 's' : ''}
                                            {isExpanded ? ' ▼' : ' ▶'}
                                        </span>
                                    )}
                                </span>
                            </button>

                            {/* Breakage check button */}
                            {!readOnly && isBreakable && !item.broken && onBreakageCheck && (
                                <button
                                    onClick={() => onBreakageCheck(item, index)}
                                    className="px-1.5 py-1 text-xs bg-amber-900/30 border border-amber-700/40
                                               text-amber-300 rounded-sm hover:bg-amber-900/50 transition-colors shrink-0"
                                    title={`Roll 1d20 breakage check — breaks on ≤ ${dc}`}
                                    aria-label={`Breakage check for ${item.name}`}
                                >
                                    🎲
                                </button>
                            )}

                            {/* Remove button */}
                            {!readOnly && onRemoveItem && (
                                <button
                                    onClick={() => onRemoveItem(index)}
                                    className="w-4 h-4 flex items-center justify-center shrink-0 text-obsidian-600 hover:text-crimson-light transition-colors"
                                    title="Remove item"
                                >
                                    <span className="text-sm">✕</span>
                                </button>
                            )}
                        </div>

                        {/* Expanded psionic powers detail */}
                        {isExpanded && hasPsionics && !item.broken && (
                            <div className="mx-2 mt-1 mb-2 p-2 bg-indigo-900/15 border border-indigo-700/25 rounded-sm">
                                <div className="text-xs text-indigo-400 font-display uppercase tracking-wider mb-1">Granted Powers</div>
                                <div className="space-y-1">
                                    {item.grantedPowers.map((gp: any, i: number) => (
                                        <div key={i} className="flex justify-between items-start gap-2 text-sm">
                                            <div>
                                                <span className="text-violet-300">{gp.name}</span>
                                                <span className="text-obsidian-500 ml-1">
                                                    {gp.usesPerDay ? `${gp.usesPerDay}/day` : 'at will'}
                                                </span>
                                            </div>
                                            <span className="text-indigo-400 font-mono shrink-0">{gp.cost} PSP</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        </>
    );
}
