'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import {
    SocketEvents,
    getWaterRequirement,
    DEHYDRATION_STAGES,
    HEAT_SICKNESS_STAGES,
    FORCED_MARCH_STAGES,
    FORCED_MARCH_BASE_HOURS,
} from 'athas-shared';
import type { SheetUpdatedPayload, EquipmentItem } from 'athas-shared';

// ─── Types ───────────────────────────────────────────────────────

interface GMSurvivalDashboardProps {
    campaignId: string;
    on?: (event: string, handler: (...args: unknown[]) => void) => (() => void);
}

interface SurvivalCharacter {
    id: string;
    name: string;
    race: string;
    speed: number;
    equipment: EquipmentItem[];
    waterSupply: number;
    dehydrationStage: number;
    heatSicknessStage: number;
    forcedMarchStage: number;
    marchHoursToday: number;
}

// Fields we care about for live updates
const DASHBOARD_FIELDS = new Set([
    'name', 'race', 'speed', 'equipment',
    'waterSupply', 'dehydrationStage',
    'heatSicknessStage',
    'forcedMarchStage', 'marchHoursToday',
]);

// Color map: stage color name → Tailwind classes (text only, for compact display)
const STAGE_TEXT_COLOR: Record<string, string> = {
    sky: 'text-sky-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
};

const STAGE_BG: Record<string, string> = {
    sky: 'bg-sky-500/20 border-sky-500/40',
    yellow: 'bg-yellow-500/20 border-yellow-500/40',
    orange: 'bg-orange-500/20 border-orange-500/40',
    red: 'bg-red-500/20 border-red-500/40',
};

// ─── Helpers ─────────────────────────────────────────────────────

function getBreakableGearCounts(equipment: EquipmentItem[]): { broken: number; total: number } {
    const breakable = (equipment || []).filter(
        e => (e.type === 'weapon' || e.type === 'armor' || e.type === 'shield') && e.breakageDC != null
    );
    return {
        broken: breakable.filter(e => e.broken).length,
        total: breakable.length,
    };
}

function getDaysRemaining(waterSupply: number, race: string): string {
    const req = getWaterRequirement(race);
    if (req.active <= 0) return '∞';
    const days = waterSupply / req.active;
    if (days >= 99) return '∞';
    return days.toFixed(1);
}

/** True if this character has any survival concern worth highlighting. */
function hasAlert(char: SurvivalCharacter): boolean {
    return (
        char.dehydrationStage >= 2 ||
        char.heatSicknessStage >= 2 ||
        char.forcedMarchStage >= 2 ||
        getBreakableGearCounts(char.equipment).broken > 0
    );
}

// ─── Component ───────────────────────────────────────────────────

export function GMSurvivalDashboard({ campaignId, on }: GMSurvivalDashboardProps) {
    const [characters, setCharacters] = useState<SurvivalCharacter[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Initial fetch ────────────────────────────────────────────
    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                const data = await api.get<SurvivalCharacter[]>('/characters');
                // Parse equipment if it arrives as a JSON string
                const parsed = data.map(c => ({
                    ...c,
                    equipment: typeof c.equipment === 'string' ? JSON.parse(c.equipment) : (c.equipment || []),
                }));
                setCharacters(parsed);
            } catch (err) {
                console.error('Failed to fetch characters for survival dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCharacters();
    }, [campaignId]);

    // ── Live updates via WebSocket ───────────────────────────────
    useEffect(() => {
        if (!on) return;
        const unsubs: Array<() => void> = [];

        unsubs.push(on(SocketEvents.SERVER_SHEET_UPDATED, (data: unknown) => {
            const payload = data as SheetUpdatedPayload;
            if (!DASHBOARD_FIELDS.has(payload.field)) return;

            setCharacters(prev =>
                prev.map(c => {
                    if (c.id !== payload.characterId) return c;
                    if (payload.field === 'equipment') {
                        const eq = typeof payload.value === 'string'
                            ? JSON.parse(payload.value)
                            : (payload.value || []);
                        return { ...c, equipment: eq };
                    }
                    return { ...c, [payload.field]: payload.value };
                })
            );
        }));

        return () => unsubs.forEach(fn => fn?.());
    }, [on]);

    // ── Derived data ─────────────────────────────────────────────
    const alertCount = useMemo(
        () => characters.filter(hasAlert).length,
        [characters]
    );

    // ── Render ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-3">
                <p className="text-xs text-obsidian-500 animate-pulse">Loading survival data...</p>
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-3 pt-3 pb-2">
                <h3 className="font-display text-xs text-sand-500 uppercase tracking-widest mb-1">
                    Party Survival
                </h3>

                {/* Alert banner */}
                {alertCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-red-900/20 border border-red-700/30 mb-2">
                        <span className="text-sm">⚠️</span>
                        <span className="text-xs text-red-300">
                            {alertCount} character{alertCount !== 1 ? 's' : ''} in danger
                        </span>
                    </div>
                )}

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_50px_40px_40px_44px_36px] gap-1 text-xs text-obsidian-500 px-1 mb-1">
                    <span>Name</span>
                    <span className="text-center" title="Water supply">💧</span>
                    <span className="text-center" title="Heat sickness">🔥</span>
                    <span className="text-center" title="March fatigue">🥾</span>
                    <span className="text-center" title="Broken gear">⚔️</span>
                    <span className="text-center" title="Base speed">🏃</span>
                </div>
            </div>

            {/* Character rows */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                {characters.map(char => (
                    <CharacterRow key={char.id} char={char} />
                ))}
            </div>

            {/* Legend */}
            <div className="px-3 py-2 border-t border-obsidian-700">
                <details className="text-xs text-obsidian-600">
                    <summary className="cursor-pointer hover:text-obsidian-400 transition-colors font-display uppercase tracking-wider">
                        Legend
                    </summary>
                    <div className="mt-2 space-y-1 pl-1">
                        <div>💧 Water — gallons remaining (days left)</div>
                        <div>🔥 Heat — sun sickness stage</div>
                        <div>🥾 March — forced march fatigue</div>
                        <div>⚔️ Gear — broken / breakable items</div>
                        <div>🏃 Speed — base movement (ft)</div>
                        <div className="mt-1.5 flex gap-2 flex-wrap">
                            <span className="text-sky-400">● OK</span>
                            <span className="text-yellow-400">● Caution</span>
                            <span className="text-orange-400">● Danger</span>
                            <span className="text-red-400">● Critical</span>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
}

// ─── Character Row ───────────────────────────────────────────────

const CharacterRow = React.memo(function CharacterRow({ char }: { char: SurvivalCharacter }) {
    const dehydration = DEHYDRATION_STAGES[char.dehydrationStage] || DEHYDRATION_STAGES[0];
    const heat = HEAT_SICKNESS_STAGES[char.heatSicknessStage] || HEAT_SICKNESS_STAGES[0];
    const march = FORCED_MARCH_STAGES[char.forcedMarchStage] || FORCED_MARCH_STAGES[0];
    const gear = getBreakableGearCounts(char.equipment);
    const daysLeft = getDaysRemaining(char.waterSupply, char.race);
    const isForced = char.marchHoursToday > FORCED_MARCH_BASE_HOURS;
    const alert = hasAlert(char);

    return (
        <div
            className={`grid grid-cols-[1fr_50px_40px_40px_44px_36px] gap-1 items-center px-1.5 py-1.5 rounded-sm border transition-colors ${
                alert
                    ? 'bg-red-950/20 border-red-800/30'
                    : 'bg-obsidian-900/50 border-obsidian-700/30 hover:border-obsidian-600'
            }`}
        >
            {/* Name + race */}
            <div className="min-w-0">
                <div className="text-xs text-sand-300 font-display truncate">{char.name}</div>
                <div className="text-xs text-obsidian-500 truncate">{char.race}</div>
            </div>

            {/* Water */}
            <div className="text-center" title={`${char.waterSupply} gal — ${daysLeft} days — ${dehydration.name}`}>
                <StageBadge
                    icon={dehydration.icon}
                    color={dehydration.color}
                    active={char.dehydrationStage > 0}
                />
                <div className="text-xs text-obsidian-500 leading-tight mt-0.5">
                    {char.waterSupply.toFixed(1)}
                </div>
            </div>

            {/* Heat */}
            <div className="text-center" title={`${heat.name}${heat.penalties ? ' — ' + heat.penalties : ''}`}>
                <StageBadge
                    icon={heat.icon}
                    color={heat.color}
                    active={char.heatSicknessStage > 0}
                />
            </div>

            {/* March */}
            <div className="text-center" title={`${march.name} — ${char.marchHoursToday}h walked${isForced ? ' (forced)' : ''}${march.penalties ? ' — ' + march.penalties : ''}`}>
                <StageBadge
                    icon={march.icon}
                    color={march.color}
                    active={char.forcedMarchStage > 0}
                />
            </div>

            {/* Broken gear */}
            <div className="text-center" title={`${gear.broken} broken / ${gear.total} breakable`}>
                {gear.total === 0 ? (
                    <span className="text-xs text-obsidian-600">—</span>
                ) : gear.broken > 0 ? (
                    <span className="text-xs text-red-400 font-mono">{gear.broken}/{gear.total}</span>
                ) : (
                    <span className="text-xs text-obsidian-500 font-mono">0/{gear.total}</span>
                )}
            </div>

            {/* Speed */}
            <div className="text-center">
                <span className="text-xs text-obsidian-400 font-mono">{char.speed}</span>
            </div>
        </div>
    );
});

// ─── Stage Badge ─────────────────────────────────────────────────

function StageBadge({ icon, color, active }: { icon: string; color: string; active: boolean }) {
    if (!active) {
        return <span className="text-sm opacity-40">{icon}</span>;
    }
    return (
        <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-sm border ${
                STAGE_BG[color] || STAGE_BG.sky
            } ${STAGE_TEXT_COLOR[color] || STAGE_TEXT_COLOR.sky}`}
        >
            {icon}
        </span>
    );
}
