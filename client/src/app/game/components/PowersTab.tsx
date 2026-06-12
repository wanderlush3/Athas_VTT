'use client';

import React from 'react';

interface PowersTabProps {
    powers: any[];
    pspCurrent: number;
    activePower: number | null;
    setActivePower: (idx: number | null) => void;
    onUsePower: (powerIndex: number, cost: number) => void;
    readOnly?: boolean;
}

export function PowersTab({ powers, pspCurrent, activePower, setActivePower, onUsePower, readOnly }: PowersTabProps) {
    if (!powers || powers.length === 0) {
        return <p className="text-xs text-obsidian-500 italic">No psionic powers learned</p>;
    }

    // Separate learned/wild-talent powers from item-granted
    const learnedPowers = powers.filter((p: any) => p.source !== 'item');
    const itemPowers = powers.filter((p: any) => p.source === 'item');
    // Group item powers by source item
    const itemPowerGroups: Record<string, { itemName: string; powers: any[]; startIndex: number }> = {};
    powers.forEach((p: any, i: number) => {
        if (p.source === 'item' && p.sourceItemId) {
            if (!itemPowerGroups[p.sourceItemId]) {
                itemPowerGroups[p.sourceItemId] = { itemName: p.sourceItemName || 'Unknown Item', powers: [], startIndex: i };
            }
            itemPowerGroups[p.sourceItemId].powers.push({ ...p, originalIndex: i });
        }
    });

    const renderPower = (power: any, index: number, isItemPower: boolean = false) => (
        <div key={index}>
            <button
                onClick={() => setActivePower(activePower === index ? null : index)}
                className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors ${activePower === index
                    ? isItemPower ? 'bg-indigo-900/30 border border-indigo-700/40' : 'bg-obsidian-700 border border-obsidian-600'
                    : isItemPower ? 'hover:bg-indigo-900/20' : 'hover:bg-obsidian-800'
                    }`}
            >
                <div className="flex justify-between items-center">
                    <span className={isItemPower ? 'text-violet-300 font-display' : 'text-sand-300 font-display'}>{power.name}</span>
                    <div className="flex items-center gap-1.5">
                        {isItemPower && power.usesPerDay && (
                            <span className="text-xs text-indigo-400 font-mono">{power.usesPerDay}/day</span>
                        )}
                        <span className="text-obsidian-400 font-mono text-sm">{power.cost} PSP</span>
                    </div>
                </div>
                {power.discipline ? (
                    <span className="text-sm text-obsidian-500">{power.discipline} {power.level && `Lvl ${power.level}`}</span>
                ) : isItemPower && (
                    <span className="text-sm text-indigo-500/60">{power.usesPerDay ? `${power.usesPerDay}/day` : 'at will'}</span>
                )}
            </button>

            {/* Power details popover */}
            {activePower === index && (
                <div className={`mx-2 mt-1 mb-2 p-2 ${isItemPower ? 'bg-indigo-900/15 border border-indigo-700/25' : 'bg-obsidian-800 border border-obsidian-600'} rounded-sm text-xs space-y-1.5`}>
                    {power.description && (
                        <p className="text-obsidian-300">{power.description}</p>
                    )}
                    {power.range && <div className="text-obsidian-400"><span className="text-obsidian-500">Range:</span> {power.range}</div>}
                    {power.duration && <div className="text-obsidian-400"><span className="text-obsidian-500">Duration:</span> {power.duration}</div>}
                    {power.display && <div className="text-obsidian-400"><span className="text-obsidian-500">Display:</span> {power.display}</div>}
                    {power.augments && <div className="text-obsidian-400"><span className="text-obsidian-500">Augment:</span> {power.augments}</div>}
                    {!readOnly && (
                        <button
                            onClick={() => onUsePower(index, power.cost)}
                            disabled={pspCurrent < power.cost}
                            className={`w-full mt-1 py-1.5 rounded-sm font-display text-xs tracking-wider transition-all
                    ${pspCurrent >= power.cost
                                    ? 'bg-gradient-to-r from-indigo-700 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-500 shadow-md shadow-violet-500/20'
                                    : 'bg-obsidian-700 text-obsidian-500 cursor-not-allowed'
                                }`}
                        >
                            {pspCurrent >= power.cost ? `🔮 Manifest (−${power.cost} PSP)` : `Insufficient PSP (need ${power.cost})`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-1">
            {/* Learned / Wild Talent powers */}
            {learnedPowers.map((power: any, i: number) => {
                const originalIndex = powers.indexOf(power);
                return renderPower(power, originalIndex);
            })}

            {/* Item-granted powers grouped by source */}
            {Object.keys(itemPowerGroups).length > 0 && (
                <>
                    {learnedPowers.length > 0 && (
                        <div className="border-t border-obsidian-700/50 pt-1 mt-2" />
                    )}
                    {Object.entries(itemPowerGroups).map(([itemId, group]) => (
                        <div key={itemId}>
                            <div className="flex items-center gap-1.5 px-2 py-1 mt-1">
                                <span className="text-xs text-indigo-400 font-display uppercase tracking-wider">🔮 via {group.itemName}</span>
                            </div>
                            {group.powers.map((power: any) => renderPower(power, power.originalIndex, true))}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
