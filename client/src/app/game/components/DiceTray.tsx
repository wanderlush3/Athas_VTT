'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DiePool {
    type: string;
    count: number;
}

interface DiceTrayProps {
    onRoll: (dice: DiePool[], modifier: number, label: string) => void;
}

const DICE_TYPES = [
    { type: 'd4', icon: '▲', sides: 4 },
    { type: 'd6', icon: '⬡', sides: 6 },
    { type: 'd8', icon: '◆', sides: 8 },
    { type: 'd10', icon: '⬠', sides: 10 },
    { type: 'd12', icon: '⬟', sides: 12 },
    { type: 'd20', icon: '⏣', sides: 20 },
];

export function DiceTray({ onRoll }: DiceTrayProps) {
    const [pool, setPool] = useState<DiePool[]>([]);
    const [modifier, setModifier] = useState(0);
    const [label, setLabel] = useState('');
    const [rolling, setRolling] = useState(false);
    const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
        };
    }, []);

    const addDie = useCallback((type: string) => {
        setPool((prev) => {
            const existing = prev.find((d) => d.type === type);
            if (existing) {
                return prev.map((d) => d.type === type ? { ...d, count: d.count + 1 } : d);
            }
            return [...prev, { type, count: 1 }];
        });
    }, []);

    const removeDie = useCallback((type: string) => {
        setPool((prev) => {
            return prev
                .map((d) => d.type === type ? { ...d, count: d.count - 1 } : d)
                .filter((d) => d.count > 0);
        });
    }, []);

    const clearPool = useCallback(() => {
        setPool([]);
        setModifier(0);
        setLabel('');
    }, []);

    const handleRoll = useCallback(() => {
        if (pool.length === 0) return;

        setRolling(true);
        // Brief animation delay
        rollTimerRef.current = setTimeout(() => {
            onRoll(pool, modifier, label);
            setRolling(false);
            setPool([]);
            setModifier(0);
            setLabel('');
        }, 400);
    }, [pool, modifier, label, onRoll]);

    // Build formula display
    const formula = pool.map((d) => `${d.count}${d.type}`).join(' + ')
        + (modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : '');

    return (
        <div className="border-t border-obsidian-700 p-3">
            <h3 className="font-display text-xs text-sand-500 uppercase tracking-widest mb-2">
                Dice Tray
            </h3>

            {/* Die buttons */}
            <div className="flex gap-1 flex-wrap mb-2">
                {DICE_TYPES.map((die) => {
                    const inPool = pool.find((d) => d.type === die.type);
                    return (
                        <button
                            key={die.type}
                            onClick={() => addDie(die.type)}
                            onContextMenu={(e) => { e.preventDefault(); removeDie(die.type); }}
                            className={`relative px-2.5 py-1.5 rounded-sm text-xs font-display
                transition-all duration-150 border
                ${inPool
                                    ? 'bg-sand-500 text-obsidian-950 border-sand-400 shadow-md shadow-sand-500/30'
                                    : 'bg-obsidian-800 border-obsidian-600 text-sand-300 hover:bg-obsidian-700 hover:border-sand-500'
                                }`}
                            title={`Left-click: add ${die.type} | Right-click: remove`}
                        >
                            <span className="mr-0.5">{die.icon}</span>
                            {die.type}
                            {inPool && (
                                <span className="absolute -top-1.5 -right-1.5 bg-crimson text-sand-100 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    {inPool.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Modifier and label row */}
            {pool.length > 0 && (
                <div className="flex gap-2 mb-2">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setModifier((m) => m - 1)}
                            aria-label="Decrease modifier"
                            className="w-6 h-6 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sand-300 text-xs hover:bg-obsidian-700"
                        >
                            −
                        </button>
                        <span className="text-xs text-sand-300 w-8 text-center font-mono">
                            {modifier >= 0 ? `+${modifier}` : modifier}
                        </span>
                        <button
                            onClick={() => setModifier((m) => m + 1)}
                            aria-label="Increase modifier"
                            className="w-6 h-6 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sand-300 text-xs hover:bg-obsidian-700"
                        >
                            +
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Label (optional)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        aria-label="Roll label"
                        className="flex-1 px-2 py-1 bg-obsidian-800 border border-obsidian-600 rounded-sm text-xs text-sand-200 placeholder-obsidian-500 focus:outline-none focus:border-sand-500"
                    />
                </div>
            )}

            {/* Formula preview */}
            {pool.length > 0 && (
                <div className="text-xs text-sand-400 mb-2 font-mono text-center truncate">
                    {formula || '—'}
                </div>
            )}

            {/* Roll / Clear buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleRoll}
                    disabled={pool.length === 0 || rolling}
                    className={`flex-1 py-2 font-display text-sm tracking-wider rounded-sm transition-all duration-200
            ${pool.length === 0
                            ? 'bg-obsidian-800 text-obsidian-500 cursor-not-allowed'
                            : rolling
                                ? 'bg-sand-600 text-obsidian-950 animate-pulse'
                                : 'bg-sand-500 text-obsidian-950 hover:bg-sand-400 shadow-lg shadow-sand-500/20 hover:shadow-sand-500/40'
                        }`}
                >
                    {rolling ? '🎲 Rolling...' : '🎲 ROLL'}
                </button>
                {pool.length > 0 && (
                    <button
                        onClick={clearPool}
                        className="px-3 py-2 bg-obsidian-800 border border-obsidian-600 rounded-sm text-xs text-obsidian-400 hover:text-sand-300 hover:border-obsidian-500 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
