'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { SocketEvents, type SheetUpdatedPayload, type PowerUsedPayload } from 'athas-shared';

interface PlayerSheetViewerProps {
    campaignId: string;
    onSelectCharacter: (characterId: string) => void;
    on?: (event: string, handler: (...args: any[]) => void) => (() => void);
}

interface CharacterSummary {
    id: string;
    name: string;
    race: string;
    classLevel: string;
    level: number;
    hitPointsCurrent: number;
    hitPointsMax: number;
    pspCurrent: number;
    pspMax: number;
    userId: string;
    equipment?: { material?: string }[];
}

/** Safely parse a JSON-string field into an array (Prisma String columns arrive as strings). */
function safeParseArray<T>(value: unknown, fallback: T[] = []): T[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return fallback; }
    }
    return fallback;
}

/**
 * GM-only component that lists all characters in the campaign
 * and allows the GM to select one to view/edit their sheet.
 */
export function PlayerSheetViewer({ campaignId, onSelectCharacter, on }: PlayerSheetViewerProps) {
    const [characters, setCharacters] = useState<CharacterSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                const data = await api.get<CharacterSummary[]>('/characters');
                setCharacters(data.map((c) => ({
                    ...c,
                    equipment: safeParseArray(c.equipment),
                })));
            } catch (err) {
                console.error('Failed to fetch characters:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCharacters();
    }, [campaignId]);

    // ── Live updates via WebSocket ─────────────────────────────────
    const VIEWER_FIELDS = new Set([
        'name', 'race', 'classLevel', 'level',
        'hitPointsCurrent', 'hitPointsMax', 'pspCurrent', 'pspMax',
        'equipment',
    ]);

    useEffect(() => {
        if (!on) return;
        const unsubs: Array<() => void> = [];

        unsubs.push(on(SocketEvents.SERVER_SHEET_UPDATED, (data: SheetUpdatedPayload) => {
            if (!VIEWER_FIELDS.has(data.field)) return;
            setCharacters((prev) =>
                prev.map((c) => {
                    if (c.id !== data.characterId) return c;
                    const value = data.field === 'equipment'
                        ? safeParseArray(data.value)
                        : data.value;
                    return { ...c, [data.field]: value };
                })
            );
        }));

        unsubs.push(on(SocketEvents.SERVER_POWER_USED, (data: PowerUsedPayload) => {
            setCharacters((prev) =>
                prev.map((c) =>
                    c.id === data.characterId
                        ? { ...c, pspCurrent: data.newPsp }
                        : c
                )
            );
        }));

        return () => unsubs.forEach((fn) => fn?.());
    }, [on]);

    if (loading) {
        return (
            <div className="p-3">
                <p className="text-xs text-obsidian-500 animate-pulse">Loading characters...</p>
            </div>
        );
    }

    if (characters.length === 0) {
        return (
            <div className="p-3">
                <p className="text-xs text-obsidian-500 italic">No characters in this campaign</p>
            </div>
        );
    }

    return (
        <div className="p-2 space-y-1">
            <h3 className="font-display text-xs text-sand-500 uppercase tracking-widest px-1 mb-1">
                Player Characters
            </h3>
            {characters.map((char) => {
                const hpPercent = Math.round((char.hitPointsCurrent / Math.max(1, char.hitPointsMax)) * 100);

                return (
                    <button
                        key={char.id}
                        onClick={() => onSelectCharacter(char.id)}
                        className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-obsidian-800 transition-colors group"
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-sand-300 font-display group-hover:text-sand-200">
                                {char.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                                {Array.isArray(char.equipment) && char.equipment.some(e => e.material?.toLowerCase() === 'metal') && (
                                    <span
                                        className="px-1 py-0.5 text-xs font-mono uppercase tracking-wide bg-amber-900/30 text-amber-400 border border-amber-500/30 rounded-sm"
                                        title="This character carries metal equipment"
                                    >
                                        ⚔ Metal
                                    </span>
                                )}
                                <span className="text-sm text-obsidian-500">{char.race}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-0.5">
                            <div className="flex-1">
                                <div className="h-1 bg-obsidian-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={char.hitPointsCurrent} aria-valuemin={0} aria-valuemax={char.hitPointsMax} aria-label="Hit Points">
                                    <div
                                        className="h-full bg-crimson-light rounded-full"
                                        style={{ width: `${hpPercent}%` }}
                                    />
                                </div>
                                <span className="text-xs text-obsidian-500">HP {char.hitPointsCurrent}/{char.hitPointsMax}</span>
                            </div>
                            {char.pspMax > 0 && (
                                <div className="flex-1">
                                    <div className="h-1 bg-obsidian-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={char.pspCurrent} aria-valuemin={0} aria-valuemax={char.pspMax} aria-label="Psionic Strength Points">
                                        <div
                                            className="h-full bg-violet-600 rounded-full"
                                            style={{ width: `${Math.round((char.pspCurrent / Math.max(1, char.pspMax)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-obsidian-500">PSP {char.pspCurrent}/{char.pspMax}</span>
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
