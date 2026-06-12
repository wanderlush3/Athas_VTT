'use client';

import React, { useState } from 'react';
import {
    getWaterRequirement, getBreakageDC, getHeatRacialBonus,
    getTerrainMultiplier, getForcedMarchDC, calculateTravelDistance,
    getNaturalHealing, NATURAL_HEALING_RULES,
    DEHYDRATION_STAGES, MATERIAL_BREAKAGE_DC,
    TERRAIN_HEAT_INTERVALS, HEAT_SICKNESS_STAGES, HEAT_RACIAL_MODIFIERS,
    TERRAIN_MOVEMENT_MODIFIERS, FORCED_MARCH_STAGES, FORCED_MARCH_BASE_HOURS,
} from 'athas-shared';
import type { EquipmentItem } from 'athas-shared';

interface SurvivalTabProps {
    race: string;
    waterSupply: number;
    dehydrationStage: number;
    heatSicknessStage: number;
    heatExposureHours: number;
    marchHoursToday: number;
    forcedMarchStage: number;
    speed: number;
    conMod: number;
    equipment: EquipmentItem[];
    syncField: (field: string, value: string | number | boolean | unknown[]) => void;
    onEquipmentChange: (equipment: EquipmentItem[]) => void;
    onBreakageCheck: (item: EquipmentItem, index: number) => void;
    level: number;
    readOnly?: boolean;
}

// ── Travel & Forced March Sub-Component ──────────────────────────
interface TravelMarchSectionProps {
    marchHoursToday: number;
    forcedMarchStage: number;
    speed: number;
    conMod: number;
    selectedTerrain: string;
    syncField: (field: string, value: string | number | boolean | unknown[]) => void;
    readOnly?: boolean;
}

function TravelMarchSection({
    marchHoursToday, forcedMarchStage, speed, conMod,
    selectedTerrain, syncField, readOnly,
}: TravelMarchSectionProps) {
    const [marchCheckResult, setMarchCheckResult] = useState<{ roll: number; dc: number; bonus: number; passed: boolean } | null>(null);

    const marchStageDef = FORCED_MARCH_STAGES[forcedMarchStage] || FORCED_MARCH_STAGES[0];
    const extraHours = Math.max(0, marchHoursToday - FORCED_MARCH_BASE_HOURS);
    const isForced = marchHoursToday > FORCED_MARCH_BASE_HOURS;
    const travelDist = calculateTravelDistance(speed, selectedTerrain, marchHoursToday);
    const terrainMult = getTerrainMultiplier(selectedTerrain);
    const milesPerHour = speed > 0 ? Math.round((speed / 5) * terrainMult * 10) / 10 : 0;

    const adjustMarch = (delta: number) => {
        if (readOnly) return;
        const newVal = Math.max(0, Math.round((marchHoursToday + delta) * 100) / 100);
        syncField('marchHoursToday', newVal);
    };

    const setMarchStage = (stage: number) => {
        if (readOnly) return;
        syncField('forcedMarchStage', Math.max(0, Math.min(3, stage)));
    };

    const rollMarchCheck = () => {
        if (readOnly) return;
        const dc = getForcedMarchDC(extraHours);
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + conMod;
        const passed = total >= dc;

        setMarchCheckResult({ roll, dc, bonus: conMod, passed });

        if (!passed && forcedMarchStage < 3) {
            syncField('forcedMarchStage', forcedMarchStage + 1);
        }

        setTimeout(() => setMarchCheckResult(null), 5000);
    };

    const restReset = () => {
        if (readOnly) return;
        syncField('marchHoursToday', 0);
        syncField('forcedMarchStage', 0);
    };

    // Progress bar calculations
    const maxHrs = Math.max(12, marchHoursToday, FORCED_MARCH_BASE_HOURS + 4);
    const marchPct = Math.min(100, (marchHoursToday / maxHrs) * 100);
    const marchBarColor = marchHoursToday <= 0 ? 'from-sky-700 to-cyan-500'
        : marchHoursToday <= FORCED_MARCH_BASE_HOURS ? 'from-emerald-700 to-emerald-500'
        : extraHours <= 2 ? 'from-yellow-700 to-yellow-500'
        : extraHours <= 4 ? 'from-orange-700 to-orange-500'
        : 'from-red-700 to-red-500';

    return (
        <div className="bg-obsidian-800/50 rounded-sm border border-obsidian-700 p-3">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-display uppercase tracking-wider text-emerald-400">
                    🥾 Travel & March
                </h3>
                <span className="text-xs text-obsidian-400 font-mono">
                    {milesPerHour} mi/hr • {speed} ft base
                </span>
            </div>

            {/* Terrain movement info */}
            <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="text-obsidian-500 uppercase tracking-wider font-display">Terrain Speed</span>
                <span className={`font-mono ${terrainMult < 1 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    ×{terrainMult}
                    {terrainMult < 1 && <span className="text-obsidian-500 ml-1">({Math.round(speed * terrainMult)} ft eff.)</span>}
                </span>
            </div>

            {/* March hours counter */}
            <div className="mb-2">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">
                        Hours Marched
                    </span>
                    <span className={`text-xs font-mono ${
                        isForced ? 'text-orange-400' :
                        marchHoursToday > 0 ? 'text-emerald-400' :
                        'text-obsidian-400'
                    }`}>
                        {marchHoursToday.toFixed(1)} hrs
                        {isForced && (
                            <span className="text-orange-400 ml-1 animate-pulse">
                                ⚠ FORCED MARCH (+{extraHours.toFixed(1)}h)
                            </span>
                        )}
                    </span>
                </div>
                {/* March bar */}
                <div className="relative h-2 bg-obsidian-900 rounded-full overflow-hidden mb-1"
                     role="progressbar" aria-valuenow={marchHoursToday} aria-valuemin={0}
                     aria-valuemax={maxHrs} aria-label="March Hours">
                    {/* 8-hour threshold marker */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-obsidian-400/60 z-10"
                        style={{ left: `${(FORCED_MARCH_BASE_HOURS / maxHrs) * 100}%` }}
                        title="8-hour safe limit"
                    />
                    <div
                        className={`h-full bg-gradient-to-r ${marchBarColor} rounded-full transition-all duration-300 ${
                            isForced ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${marchPct}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-obsidian-600 font-mono mb-1">
                    <span>0</span>
                    <span>{FORCED_MARCH_BASE_HOURS}h safe</span>
                    <span>{maxHrs}h</span>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => adjustMarch(-1)} aria-label="Remove one hour"
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors">−1 hr</button>
                        <button onClick={() => adjustMarch(1)} aria-label="Add one hour"
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors">+1 hr</button>
                        <button onClick={() => adjustMarch(2)} aria-label="Add two hours"
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors">+2 hr</button>
                        <button onClick={() => adjustMarch(4)} aria-label="Add four hours"
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors">+4 hr</button>
                    </div>
                )}
            </div>

            {/* Travel distance estimate */}
            {marchHoursToday > 0 && (
                <div className="mb-2 p-2 bg-obsidian-900/50 rounded-sm border border-obsidian-700/50 text-xs">
                    <span className="text-obsidian-500 font-display uppercase tracking-wider">Distance: </span>
                    <span className="text-sand-300 font-mono font-bold">{travelDist} miles</span>
                    <span className="text-obsidian-500 ml-1">
                        ({marchHoursToday.toFixed(1)}h × {milesPerHour} mi/hr)
                    </span>
                </div>
            )}

            {/* CON check for forced march */}
            {!readOnly && isForced && forcedMarchStage < 3 && (
                <div className="mb-2">
                    <button
                        onClick={rollMarchCheck}
                        className="w-full py-1.5 text-xs font-display uppercase tracking-wider rounded-sm
                                   transition-all duration-200 border
                                   bg-orange-900/30 border-orange-700/40 text-orange-300
                                   hover:bg-orange-900/50 hover:border-orange-600/60"
                        aria-label="Roll CON check vs forced march"
                    >
                        🎲 CON Check vs Forced March (DC {getForcedMarchDC(extraHours)})
                        <span className="text-obsidian-400 ml-1">
                            — 1d20{conMod >= 0 ? '+' : ''}{conMod}
                        </span>
                    </button>
                </div>
            )}

            {/* March check result toast */}
            {marchCheckResult && (
                <div className={`mb-2 p-2 rounded-sm border text-xs animate-pulse ${
                    marchCheckResult.passed
                        ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
                        : 'bg-crimson-dark/30 border-crimson/50 text-crimson-light'
                }`}>
                    <span className="font-display uppercase tracking-wider">
                        {marchCheckResult.passed ? '✅ Pressed on!' : '😩 OVERCOME!'}
                    </span>
                    <span className="ml-2 font-mono">
                        Rolled {marchCheckResult.roll}+{marchCheckResult.bonus} = {marchCheckResult.roll + marchCheckResult.bonus}
                        {marchCheckResult.passed
                            ? ` (≥ DC ${marchCheckResult.dc})`
                            : ` (< DC ${marchCheckResult.dc}) — fatigue advances!`
                        }
                    </span>
                </div>
            )}

            {/* Forced march stage selector */}
            <div className="mt-3 pt-2 border-t border-obsidian-700">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">
                        March Fatigue
                    </span>
                </div>
                <div className="flex gap-1">
                    {FORCED_MARCH_STAGES.map((stage) => {
                        const isActive = forcedMarchStage === stage.stage;
                        const colorMap: Record<string, string> = {
                            sky: isActive ? 'bg-sky-500/30 border-sky-500/60 text-sky-300' : 'border-obsidian-600 text-obsidian-500 hover:border-sky-700',
                            yellow: isActive ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-300' : 'border-obsidian-600 text-obsidian-500 hover:border-yellow-700',
                            orange: isActive ? 'bg-orange-500/30 border-orange-500/60 text-orange-300' : 'border-obsidian-600 text-obsidian-500 hover:border-orange-700',
                            red: isActive ? 'bg-red-500/30 border-red-500/60 text-red-300' : 'border-obsidian-600 text-obsidian-500 hover:border-red-700',
                        };
                        return (
                            <button
                                key={stage.stage}
                                onClick={() => setMarchStage(stage.stage)}
                                disabled={readOnly}
                                className={`flex-1 py-1.5 px-1 text-xs rounded-sm border transition-all ${
                                    colorMap[stage.color] || colorMap.sky
                                } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                title={stage.penalties || 'No penalties'}
                                aria-pressed={isActive}
                            >
                                <div className="text-center">
                                    <span className="text-sm">{stage.icon}</span>
                                    <div className="text-xs mt-0.5 truncate">{stage.name}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                {marchStageDef.penalties && (
                    <div className={`mt-2 p-2 rounded-sm text-xs border ${
                        forcedMarchStage === 1 ? 'bg-yellow-900/20 border-yellow-700/30 text-yellow-300' :
                        forcedMarchStage === 2 ? 'bg-orange-900/20 border-orange-700/30 text-orange-300' :
                        'bg-red-900/20 border-red-700/30 text-red-300'
                    }`}>
                        <span className="font-display uppercase tracking-wider text-xs opacity-70">Penalties: </span>
                        {marchStageDef.penalties}
                    </div>
                )}
            </div>

            {/* Rest button */}
            {!readOnly && (marchHoursToday > 0 || forcedMarchStage > 0) && (
                <div className="mt-2">
                    <button
                        onClick={restReset}
                        className="w-full py-1.5 text-xs font-display uppercase tracking-wider rounded-sm
                                   transition-all duration-200 border
                                   bg-sky-900/30 border-sky-700/40 text-sky-300
                                   hover:bg-sky-900/50 hover:border-sky-600/60"
                        aria-label="Rest and reset march"
                    >
                        🏕️ Make Camp — Reset March & Fatigue
                    </button>
                </div>
            )}

            {/* Collapsible travel rules reference */}
            <div className="mt-3 pt-2 border-t border-obsidian-700">
                <details className="text-xs text-obsidian-500">
                    <summary className="cursor-pointer hover:text-obsidian-400 transition-colors font-display uppercase tracking-wider">
                        📖 Travel & Forced March Rules
                    </summary>
                    <div className="mt-2 space-y-2 text-obsidian-400">
                        <p>Characters can march <span className="text-emerald-400">{FORCED_MARCH_BASE_HOURS} hours</span> per day without penalty. Each hour beyond requires a <span className="text-orange-400">CON check (DC 10 + extra hours)</span>.</p>
                        <p>Failure causes <span className="text-yellow-400">1d6 nonlethal damage</span> and advances fatigue: Normal → Fatigued → Exhausted → Collapsed.</p>
                        <div>
                            <div className="font-display uppercase tracking-wider text-xs text-obsidian-500 mb-1">Terrain Movement Modifiers</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-xs">
                                {TERRAIN_MOVEMENT_MODIFIERS.map(t => (
                                    <div key={t.id} className="flex justify-between">
                                        <span>{t.icon} {t.name}</span>
                                        <span className={t.multiplier < 1 ? 'text-orange-400' : 'text-emerald-400'}>
                                            ×{t.multiplier}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="font-display uppercase tracking-wider text-xs text-obsidian-500 mb-1">Forced March DCs</div>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 font-mono text-xs">
                                {[1, 2, 3, 4, 5, 6].map(h => (
                                    <div key={h} className="flex justify-between">
                                        <span>+{h}hr</span>
                                        <span className="text-orange-400">DC {getForcedMarchDC(h)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-obsidian-500">On Athas, the brutal sun compounds forced march exhaustion. Track heat exposure separately.</p>
                    </div>
                </details>
            </div>
        </div>
    );
}

export function SurvivalTab({
    race, waterSupply, dehydrationStage, heatSicknessStage, heatExposureHours,
    marchHoursToday, forcedMarchStage, speed,
    conMod, equipment, syncField, onEquipmentChange, onBreakageCheck, level, readOnly,
}: SurvivalTabProps) {
    const waterReq = getWaterRequirement(race);
    const daysRemaining = waterReq.active > 0 ? waterSupply / waterReq.active : Infinity;
    const stageDef = DEHYDRATION_STAGES[dehydrationStage] || DEHYDRATION_STAGES[0];

    // Filter to weapons/armor/shields that have breakage potential
    const breakableItems = equipment
        .map((item, index) => ({ item, index }))
        .filter(({ item }) =>
            (item.type === 'weapon' || item.type === 'armor' || item.type === 'shield') &&
            item.material
        );

    const adjustWater = (delta: number) => {
        if (readOnly) return;
        const newVal = Math.max(0, Math.round((waterSupply + delta) * 100) / 100);
        syncField('waterSupply', newVal);
    };

    const consumeDaily = () => {
        if (readOnly) return;
        const newVal = Math.max(0, Math.round((waterSupply - waterReq.active) * 100) / 100);
        syncField('waterSupply', newVal);
        // Auto-advance dehydration if water runs out
        if (newVal <= 0 && dehydrationStage < 3) {
            syncField('dehydrationStage', dehydrationStage + 1);
        }
    };

    const setDehydration = (stage: number) => {
        if (readOnly) return;
        syncField('dehydrationStage', Math.max(0, Math.min(3, stage)));
    };

    const toggleBroken = (eqIndex: number) => {
        if (readOnly) return;
        const updated = [...equipment];
        updated[eqIndex] = { ...updated[eqIndex], broken: !updated[eqIndex].broken };
        onEquipmentChange(updated);
    };

    // Water bar calculations
    const maxDisplay = Math.max(waterReq.active * 3, waterSupply, 2); // show at least 3 days' worth
    const waterPercent = maxDisplay > 0 ? Math.min(100, (waterSupply / maxDisplay) * 100) : 0;
    const waterBarColor = waterSupply <= 0 ? 'from-red-700 to-red-500'
        : daysRemaining <= 1 ? 'from-orange-700 to-orange-500'
        : daysRemaining <= 2 ? 'from-yellow-700 to-yellow-500'
        : 'from-sky-700 to-cyan-500';

    // ── Heat & Sun Sickness state ──
    const [selectedTerrain, setSelectedTerrain] = useState('sandy-wastes');
    const [heatCheckResult, setHeatCheckResult] = useState<{ roll: number; dc: number; bonus: number; passed: boolean } | null>(null);
    const [mitigations, setMitigations] = useState({ nightTravel: false, desertClothing: false, adequateWater: false, shade: false });

    const terrain = TERRAIN_HEAT_INTERVALS.find(t => t.id === selectedTerrain) || TERRAIN_HEAT_INTERVALS[1];
    const heatStageDef = HEAT_SICKNESS_STAGES[heatSicknessStage] || HEAT_SICKNESS_STAGES[0];
    const racialHeat = getHeatRacialBonus(race);
    const mitigationCount = Object.values(mitigations).filter(Boolean).length;

    const adjustExposure = (delta: number) => {
        if (readOnly) return;
        const newVal = Math.max(0, Math.round((heatExposureHours + delta) * 100) / 100);
        syncField('heatExposureHours', newVal);
    };

    const setHeatStage = (stage: number) => {
        if (readOnly) return;
        syncField('heatSicknessStage', Math.max(0, Math.min(3, stage)));
    };

    const rollHeatCheck = () => {
        if (readOnly) return;
        const baseDC = 15 + heatSicknessStage;
        const racialBonus = racialHeat?.conBonus || 0;
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + conMod + racialBonus;
        const passed = total >= baseDC;

        setHeatCheckResult({ roll, dc: baseDC, bonus: conMod + racialBonus, passed });

        if (!passed && heatSicknessStage < 3) {
            syncField('heatSicknessStage', heatSicknessStage + 1);
        }

        setTimeout(() => setHeatCheckResult(null), 5000);
    };

    const toggleMitigation = (key: keyof typeof mitigations) => {
        setMitigations(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-4">
            {/* ── Water Supply Section ── */}
            <div className="bg-obsidian-800/50 rounded-sm border border-obsidian-700 p-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-display uppercase tracking-wider text-sky-400">
                        💧 Water Supply
                    </h3>
                    <span className="text-xs text-obsidian-400">
                        {race} — {waterReq.active} gal/day (active)
                    </span>
                </div>

                {/* Water bar */}
                <div className="mb-2">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-mono text-sand-200">
                            {waterSupply.toFixed(2)} gallons
                        </span>
                        <span className={`text-xs font-mono ${
                            daysRemaining <= 1 ? 'text-red-400' :
                            daysRemaining <= 2 ? 'text-orange-400' :
                            'text-sky-400'
                        }`}>
                            {waterSupply <= 0 ? 'NO WATER' :
                             daysRemaining === Infinity ? '∞ days' :
                             `~${daysRemaining.toFixed(1)} days`}
                        </span>
                    </div>
                    <div className="h-2 bg-obsidian-900 rounded-full overflow-hidden"
                         role="progressbar" aria-valuenow={waterSupply} aria-valuemin={0}
                         aria-valuemax={maxDisplay} aria-label="Water Supply">
                        <div
                            className={`h-full bg-gradient-to-r ${waterBarColor} rounded-full transition-all duration-300 ${
                                waterSupply <= 0 ? 'animate-pulse' : ''
                            }`}
                            style={{ width: `${waterPercent}%` }}
                        />
                    </div>
                </div>

                {/* Water controls */}
                {!readOnly && (
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={() => adjustWater(-0.5)}
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors"
                            aria-label="Remove half gallon"
                        >
                            −½ gal
                        </button>
                        <button
                            onClick={() => adjustWater(-0.25)}
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors"
                            aria-label="Remove quarter gallon"
                        >
                            −¼ gal
                        </button>
                        <button
                            onClick={() => adjustWater(0.25)}
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors"
                            aria-label="Add quarter gallon"
                        >
                            +¼ gal
                        </button>
                        <button
                            onClick={() => adjustWater(0.5)}
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors"
                            aria-label="Add half gallon"
                        >
                            +½ gal
                        </button>
                        <button
                            onClick={() => adjustWater(1)}
                            className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                       text-sand-300 hover:bg-obsidian-600 transition-colors"
                            aria-label="Add one gallon"
                        >
                            +1 gal
                        </button>
                    </div>
                )}

                {!readOnly && (
                    <button
                        onClick={consumeDaily}
                        disabled={waterSupply <= 0}
                        className={`w-full py-1.5 text-xs font-display uppercase tracking-wider rounded-sm
                                   transition-all duration-200 border ${
                            waterSupply <= 0
                                ? 'bg-obsidian-800 border-obsidian-700 text-obsidian-500 cursor-not-allowed'
                                : 'bg-sky-900/30 border-sky-700/40 text-sky-300 hover:bg-sky-900/50 hover:border-sky-600/60'
                        }`}
                    >
                        🏜️ Consume Daily Water ({waterReq.active} gal)
                    </button>
                )}

                {/* Dehydration Stage */}
                <div className="mt-3 pt-2 border-t border-obsidian-700">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">
                            Hydration Status
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {DEHYDRATION_STAGES.map((stage) => {
                            const isActive = dehydrationStage === stage.stage;
                            const colorMap: Record<string, string> = {
                                sky: isActive ? 'bg-sky-500/30 border-sky-500/60 text-sky-300' : 'border-obsidian-600 text-obsidian-500 hover:border-sky-700',
                                yellow: isActive ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-300' : 'border-obsidian-600 text-obsidian-500 hover:border-yellow-700',
                                orange: isActive ? 'bg-orange-500/30 border-orange-500/60 text-orange-300' : 'border-obsidian-600 text-obsidian-500 hover:border-orange-700',
                                red: isActive ? 'bg-red-500/30 border-red-500/60 text-red-300' : 'border-obsidian-600 text-obsidian-500 hover:border-red-700',
                            };
                            return (
                                <button
                                    key={stage.stage}
                                    onClick={() => setDehydration(stage.stage)}
                                    disabled={readOnly}
                                    className={`flex-1 py-1.5 px-1 text-xs rounded-sm border transition-all ${
                                        colorMap[stage.color] || colorMap.sky
                                    } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                    title={stage.penalties || 'No penalties'}
                                    aria-pressed={isActive}
                                >
                                    <div className="text-center">
                                        <span className="text-sm">{stage.icon}</span>
                                        <div className="text-xs mt-0.5 truncate">{stage.name}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {stageDef.penalties && (
                        <div className={`mt-2 p-2 rounded-sm text-xs border ${
                            dehydrationStage === 1 ? 'bg-yellow-900/20 border-yellow-700/30 text-yellow-300' :
                            dehydrationStage === 2 ? 'bg-orange-900/20 border-orange-700/30 text-orange-300' :
                            'bg-red-900/20 border-red-700/30 text-red-300'
                        }`}>
                            <span className="font-display uppercase tracking-wider text-xs opacity-70">Penalties: </span>
                            {stageDef.penalties}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Heat & Sun Sickness Section ── */}
            <div className="bg-obsidian-800/50 rounded-sm border border-obsidian-700 p-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-display uppercase tracking-wider text-orange-400">
                        🔥 Heat & Sun Exposure
                    </h3>
                    {racialHeat && (
                        <span className="text-xs text-emerald-400 font-mono">
                            {race}: +{racialHeat.conBonus} CON vs heat
                        </span>
                    )}
                </div>

                {/* Terrain selector */}
                <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">
                            Terrain
                        </span>
                        <span className="text-xs text-obsidian-400 font-mono">
                            CON check every {terrain.checkIntervalHours}hr{terrain.checkIntervalHours > 1 ? 's' : ''}
                            {mitigationCount > 0 && (
                                <span className="text-emerald-400 ml-1">
                                    ({mitigationCount} mitigation{mitigationCount > 1 ? 's' : ''})
                                </span>
                            )}
                        </span>
                    </div>
                    <select
                        value={selectedTerrain}
                        onChange={(e) => setSelectedTerrain(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-obsidian-900 border border-obsidian-600 rounded-sm
                                   text-sand-200 focus:outline-none focus:border-orange-500/50"
                        aria-label="Terrain type"
                    >
                        {TERRAIN_HEAT_INTERVALS.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.icon} {t.name} — check every {t.checkIntervalHours}hr{t.checkIntervalHours > 1 ? 's' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Exposure counter */}
                <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">
                            Sun Exposure
                        </span>
                        <span className={`text-xs font-mono ${
                            heatExposureHours >= terrain.checkIntervalHours * 2 ? 'text-red-400' :
                            heatExposureHours >= terrain.checkIntervalHours ? 'text-orange-400' :
                            'text-obsidian-400'
                        }`}>
                            {heatExposureHours.toFixed(1)} hrs
                            {heatExposureHours >= terrain.checkIntervalHours && (
                                <span className="text-orange-400 ml-1 animate-pulse">⚠ CHECK DUE</span>
                            )}
                        </span>
                    </div>
                    {/* Exposure bar */}
                    {(() => {
                        const maxHrs = Math.max(terrain.checkIntervalHours * 3, heatExposureHours, 4);
                        const exposurePct = Math.min(100, (heatExposureHours / maxHrs) * 100);
                        const barColor = heatExposureHours <= 0 ? 'from-sky-700 to-cyan-500'
                            : heatExposureHours >= terrain.checkIntervalHours * 2 ? 'from-red-700 to-red-500'
                            : heatExposureHours >= terrain.checkIntervalHours ? 'from-orange-700 to-orange-500'
                            : 'from-yellow-700 to-yellow-500';
                        return (
                            <div className="h-2 bg-obsidian-900 rounded-full overflow-hidden mb-1"
                                 role="progressbar" aria-valuenow={heatExposureHours} aria-valuemin={0}
                                 aria-valuemax={maxHrs} aria-label="Sun Exposure">
                                <div
                                    className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-300 ${
                                        heatExposureHours >= terrain.checkIntervalHours ? 'animate-pulse' : ''
                                    }`}
                                    style={{ width: `${exposurePct}%` }}
                                />
                            </div>
                        );
                    })()}
                    {!readOnly && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => adjustExposure(-1)} aria-label="Remove one hour"
                                className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                           text-sand-300 hover:bg-obsidian-600 transition-colors">−1 hr</button>
                            <button onClick={() => adjustExposure(1)} aria-label="Add one hour"
                                className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                           text-sand-300 hover:bg-obsidian-600 transition-colors">+1 hr</button>
                            <button onClick={() => adjustExposure(2)} aria-label="Add two hours"
                                className="px-2 py-1 text-xs bg-obsidian-700 border border-obsidian-600 rounded-sm
                                           text-sand-300 hover:bg-obsidian-600 transition-colors">+2 hr</button>
                            <button onClick={() => syncField('heatExposureHours', 0)} aria-label="Reset exposure"
                                className="px-2 py-1 text-xs bg-sky-900/30 border border-sky-700/40 rounded-sm
                                           text-sky-300 hover:bg-sky-900/50 transition-colors ml-auto">🏕️ Rest/Shade</button>
                        </div>
                    )}
                </div>

                {/* Mitigation checkboxes */}
                <div className="mb-2 grid grid-cols-2 gap-1">
                    {[
                        { key: 'nightTravel' as const, label: 'Night Travel', icon: '🌙' },
                        { key: 'desertClothing' as const, label: 'Desert Clothing', icon: '🧥' },
                        { key: 'adequateWater' as const, label: 'Adequate Water', icon: '💧' },
                        { key: 'shade' as const, label: 'Shade/Shelter', icon: '⛺' },
                    ].map(({ key, label, icon }) => (
                        <label key={key} className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border cursor-pointer
                            transition-all ${
                            mitigations[key]
                                ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300'
                                : 'bg-obsidian-800/50 border-obsidian-700 text-obsidian-500 hover:border-obsidian-600'
                        }`}>
                            <input type="checkbox" checked={mitigations[key]} onChange={() => toggleMitigation(key)}
                                className="sr-only" />
                            <span>{icon}</span>
                            <span>{label}</span>
                            {mitigations[key] && <span className="text-emerald-400 ml-auto">✓</span>}
                        </label>
                    ))}
                </div>

                {/* Heat sickness stage */}
                <div className="mt-3 pt-2 border-t border-obsidian-700">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">
                            Heat Status
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {HEAT_SICKNESS_STAGES.map((stage) => {
                            const isActive = heatSicknessStage === stage.stage;
                            const colorMap: Record<string, string> = {
                                sky: isActive ? 'bg-sky-500/30 border-sky-500/60 text-sky-300' : 'border-obsidian-600 text-obsidian-500 hover:border-sky-700',
                                yellow: isActive ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-300' : 'border-obsidian-600 text-obsidian-500 hover:border-yellow-700',
                                orange: isActive ? 'bg-orange-500/30 border-orange-500/60 text-orange-300' : 'border-obsidian-600 text-obsidian-500 hover:border-orange-700',
                                red: isActive ? 'bg-red-500/30 border-red-500/60 text-red-300' : 'border-obsidian-600 text-obsidian-500 hover:border-red-700',
                            };
                            return (
                                <button
                                    key={stage.stage}
                                    onClick={() => setHeatStage(stage.stage)}
                                    disabled={readOnly}
                                    className={`flex-1 py-1.5 px-1 text-xs rounded-sm border transition-all ${
                                        colorMap[stage.color] || colorMap.sky
                                    } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                    title={stage.penalties || 'No penalties'}
                                    aria-pressed={isActive}
                                >
                                    <div className="text-center">
                                        <span className="text-sm">{stage.icon}</span>
                                        <div className="text-xs mt-0.5 truncate">{stage.name}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {heatStageDef.penalties && (
                        <div className={`mt-2 p-2 rounded-sm text-xs border ${
                            heatSicknessStage === 1 ? 'bg-yellow-900/20 border-yellow-700/30 text-yellow-300' :
                            heatSicknessStage === 2 ? 'bg-orange-900/20 border-orange-700/30 text-orange-300' :
                            'bg-red-900/20 border-red-700/30 text-red-300'
                        }`}>
                            <span className="font-display uppercase tracking-wider text-xs opacity-70">Penalties: </span>
                            {heatStageDef.penalties}
                        </div>
                    )}
                </div>

                {/* CON Check button */}
                {!readOnly && (
                    <div className="mt-2">
                        <button
                            onClick={rollHeatCheck}
                            className="w-full py-1.5 text-xs font-display uppercase tracking-wider rounded-sm
                                       transition-all duration-200 border
                                       bg-orange-900/30 border-orange-700/40 text-orange-300
                                       hover:bg-orange-900/50 hover:border-orange-600/60"
                            aria-label="Roll CON check vs heat"
                        >
                            🎲 CON Check vs Heat (DC {15 + heatSicknessStage})
                            <span className="text-obsidian-400 ml-1">
                                — 1d20{conMod >= 0 ? '+' : ''}{conMod}
                                {(racialHeat?.conBonus || 0) > 0 && `+${racialHeat!.conBonus} racial`}
                            </span>
                        </button>
                    </div>
                )}

                {/* CON check result toast */}
                {heatCheckResult && (
                    <div className={`mt-2 p-2 rounded-sm border text-xs animate-pulse ${
                        heatCheckResult.passed
                            ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
                            : 'bg-crimson-dark/30 border-crimson/50 text-crimson-light'
                    }`}>
                        <span className="font-display uppercase tracking-wider">
                            {heatCheckResult.passed ? '✅ Endured!' : '🔥 OVERCOME!'}
                        </span>
                        <span className="ml-2 font-mono">
                            Rolled {heatCheckResult.roll}+{heatCheckResult.bonus} = {heatCheckResult.roll + heatCheckResult.bonus}
                            {heatCheckResult.passed
                                ? ` (≥ DC ${heatCheckResult.dc})`
                                : ` (< DC ${heatCheckResult.dc}) — stage advanced!`
                            }
                        </span>
                    </div>
                )}

                {/* Collapsible heat rules reference */}
                <div className="mt-3 pt-2 border-t border-obsidian-700">
                    <details className="text-xs text-obsidian-500">
                        <summary className="cursor-pointer hover:text-obsidian-400 transition-colors font-display uppercase tracking-wider">
                            📖 Heat & Sun Sickness Rules
                        </summary>
                        <div className="mt-2 space-y-2 text-obsidian-400">
                            <p>Characters exposed to the Athasian sun must make periodic <span className="text-orange-400">CON checks</span> or suffer heat sickness.</p>
                            <div>
                                <div className="font-display uppercase tracking-wider text-xs text-obsidian-500 mb-1">Terrain Check Intervals</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-xs">
                                    {TERRAIN_HEAT_INTERVALS.map(t => (
                                        <div key={t.id} className="flex justify-between">
                                            <span>{t.icon} {t.name}</span>
                                            <span className="text-obsidian-400">every {t.checkIntervalHours}hr</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="font-display uppercase tracking-wider text-xs text-obsidian-500 mb-1">Racial Bonuses</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-xs">
                                    {HEAT_RACIAL_MODIFIERS.map(r => (
                                        <div key={r.race} className="flex justify-between">
                                            <span>{r.race}</span>
                                            <span className="text-emerald-400">+{r.conBonus}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-obsidian-500">Mitigating factors (night travel, desert clothing, adequate water, shade) are advisory — GM may grant bonus or skip checks.</p>
                        </div>
                    </details>
                </div>
            </div>

            {/* ── Travel & Forced March Section ── */}
            <TravelMarchSection
                marchHoursToday={marchHoursToday}
                forcedMarchStage={forcedMarchStage}
                speed={speed}
                conMod={conMod}
                selectedTerrain={selectedTerrain}
                syncField={syncField}
                readOnly={readOnly}
            />

            {/* ── Weapon / Armor Breakage Section ── */}
            <div className="bg-obsidian-800/50 rounded-sm border border-obsidian-700 p-3">
                <h3 className="text-xs font-display uppercase tracking-wider text-amber-400 mb-2">
                    ⚔️ Equipment Durability
                </h3>

                {breakableItems.length === 0 ? (
                    <p className="text-xs text-obsidian-500 italic">No weapons or armor equipped</p>
                ) : (
                    <div className="space-y-1.5">
                        {breakableItems.map(({ item, index }) => {
                            const dc = getBreakageDC(item.material || '');
                            const isMetal = dc === null;
                            const isBroken = item.broken;

                            return (
                                <div
                                    key={item.id || index}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs ${
                                        isBroken ? 'bg-crimson-dark/20 border border-crimson/30' :
                                        isMetal ? 'bg-amber-900/10 border border-amber-700/20' :
                                        'bg-obsidian-800/50 border border-obsidian-700'
                                    }`}
                                >
                                    {/* Status icon */}
                                    <span className="text-sm shrink-0">
                                        {isBroken ? '💔' : isMetal ? '✨' : '⚔️'}
                                    </span>

                                    {/* Item info */}
                                    <div className="flex-1 min-w-0">
                                        <div className={`flex justify-between ${isBroken ? 'line-through text-obsidian-500' : 'text-sand-300'}`}>
                                            <span className="truncate">{item.name}</span>
                                            {item.damage && (
                                                <span className="text-obsidian-400 shrink-0 ml-1">
                                                    {isBroken ? `${item.damage} (halved)` : item.damage}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`${
                                                isMetal ? 'text-amber-400' : 'text-obsidian-500'
                                            }`}>
                                                {item.material}
                                            </span>
                                            {isMetal ? (
                                                <span className="text-amber-400/70 text-xs">Unbreakable</span>
                                            ) : (
                                                <span className={`font-mono ${isBroken ? 'text-crimson-light' : 'text-obsidian-400'}`}>
                                                    Break DC {dc}
                                                    <span className="text-obsidian-600 ml-1">
                                                        (1d20 ≤ {dc})
                                                    </span>
                                                </span>
                                            )}
                                            {isBroken && (
                                                <span className="text-crimson-light font-display uppercase tracking-wider">
                                                    BROKEN
                                                </span>
                                            )}
                                        </div>
                                        {isBroken && item.type === 'armor' && item.armorBonus && (
                                            <div className="text-crimson-light/70 text-xs mt-0.5">
                                                AC bonus halved: +{item.armorBonus} → +{Math.floor(item.armorBonus / 2)}
                                            </div>
                                        )}
                                        {isBroken && (item.type === 'weapon') && (
                                            <div className="text-crimson-light/70 text-xs mt-0.5">
                                                Damage halved until repaired
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {!readOnly && !isMetal && (
                                        <div className="flex gap-1 shrink-0">
                                            {isBroken ? (
                                                <button
                                                    onClick={() => toggleBroken(index)}
                                                    className="px-2 py-1 text-xs bg-emerald-900/30 border border-emerald-700/40
                                                               text-emerald-300 rounded-sm hover:bg-emerald-900/50 transition-colors"
                                                    title="Repair this item"
                                                >
                                                    🔧 Repair
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onBreakageCheck(item, index)}
                                                    className="px-2 py-1 text-xs bg-amber-900/30 border border-amber-700/40
                                                               text-amber-300 rounded-sm hover:bg-amber-900/50 transition-colors"
                                                    title={`Roll 1d20 breakage check — breaks on ≤ ${dc}`}
                                                >
                                                    🎲 Check
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Breakage rules reference */}
                <div className="mt-3 pt-2 border-t border-obsidian-700">
                    <details className="text-xs text-obsidian-500">
                        <summary className="cursor-pointer hover:text-obsidian-400 transition-colors font-display uppercase tracking-wider">
                            📖 Breakage Rules Reference
                        </summary>
                        <div className="mt-2 space-y-1 text-obsidian-400">
                            <p>On a <span className="text-crimson-light">natural 1</span> attack roll, non-metal weapons must make a breakage check.</p>
                            <p>Roll 1d20 — if result ≤ the weapon's Break DC, it shatters.</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5 font-mono text-xs">
                                {Object.entries(MATERIAL_BREAKAGE_DC).map(([mat, dc]) => (
                                    <div key={mat} className="flex justify-between">
                                        <span className="capitalize">{mat}</span>
                                        <span className={dc === null ? 'text-amber-400' : 'text-obsidian-400'}>
                                            {dc === null ? '—' : `DC ${dc}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </details>
                </div>
            </div>

            {/* ── Natural Healing Section (C1) ── */}
            <NaturalHealingSection level={level} readOnly={readOnly} />
        </div>
    );
}

// ── Natural Healing Sub-Component ────────────────────────────────────
interface NaturalHealingSectionProps {
    level: number;
    readOnly?: boolean;
}

function NaturalHealingSection({ level, readOnly }: NaturalHealingSectionProps) {
    const [hasAdequateWater, setHasAdequateWater] = useState(false);
    const [hasShade, setHasShade] = useState(false);

    const healing = getNaturalHealing(level, hasAdequateWater, hasShade);

    return (
        <div className="bg-obsidian-800/50 rounded-sm border border-obsidian-700 p-3">
            <h3 className="text-xs font-display uppercase tracking-wider text-emerald-400 mb-2">
                🩹 Natural Healing
            </h3>

            {/* Rest condition toggles */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <label
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border text-xs cursor-pointer transition-colors ${
                        hasAdequateWater
                            ? 'bg-sky-900/30 border-sky-600/40 text-sky-300'
                            : 'bg-obsidian-800/30 border-obsidian-700 text-obsidian-500'
                    } ${readOnly ? 'pointer-events-none opacity-60' : 'hover:border-sky-600/60'}`}
                >
                    <input
                        type="checkbox"
                        checked={hasAdequateWater}
                        onChange={() => setHasAdequateWater(prev => !prev)}
                        disabled={readOnly}
                        className="sr-only"
                    />
                    <span>{hasAdequateWater ? '✅' : '⬜'}</span>
                    <span>Adequate Water</span>
                </label>

                <label
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm border text-xs cursor-pointer transition-colors ${
                        hasShade
                            ? 'bg-sky-900/30 border-sky-600/40 text-sky-300'
                            : 'bg-obsidian-800/30 border-obsidian-700 text-obsidian-500'
                    } ${readOnly ? 'pointer-events-none opacity-60' : 'hover:border-sky-600/60'}`}
                >
                    <input
                        type="checkbox"
                        checked={hasShade}
                        onChange={() => setHasShade(prev => !prev)}
                        disabled={readOnly}
                        className="sr-only"
                    />
                    <span>{hasShade ? '✅' : '⬜'}</span>
                    <span>Shade / Shelter</span>
                </label>
            </div>

            {/* Healing rates display */}
            <div className={`rounded-sm border p-2 mb-2 ${
                healing.isHalved
                    ? 'bg-amber-900/20 border-amber-700/30'
                    : 'bg-emerald-900/20 border-emerald-700/30'
            }`}>
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-display uppercase tracking-wider ${
                        healing.isHalved ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                        {healing.isHalved ? '⚠️ Healing Halved' : '❤️ Full Healing'}
                    </span>
                    <span className="text-xs text-obsidian-500">Level {level}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-obsidian-400">Rest (8 hrs)</span>
                        <span className={`font-mono ${
                            healing.isHalved ? 'text-amber-300' : 'text-emerald-300'
                        }`}>
                            {healing.hpPerDay} HP
                            {healing.isHalved && (
                                <span className="text-obsidian-600 line-through ml-1">
                                    {healing.baseHpPerDay}
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-obsidian-400">
                            Long-term (Heal DC {NATURAL_HEALING_RULES.healCheckDC})
                        </span>
                        <span className={`font-mono ${
                            healing.isHalved ? 'text-amber-300' : 'text-emerald-300'
                        }`}>
                            {healing.hpLongTermCare} HP
                            {healing.isHalved && (
                                <span className="text-obsidian-600 line-through ml-1">
                                    {healing.baseLongTermCare}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                {healing.isHalved && (
                    <div className="mt-1.5 text-xs text-amber-400/70">
                        {healing.reasons.join(' • ')}
                    </div>
                )}
            </div>

            {/* Rules reference */}
            <div className="pt-2 border-t border-obsidian-700">
                <details className="text-xs text-obsidian-500">
                    <summary className="cursor-pointer hover:text-obsidian-400 transition-colors font-display uppercase tracking-wider">
                        📖 Natural Healing Rules
                    </summary>
                    <div className="mt-2 space-y-1 text-obsidian-400">
                        <p>
                            Characters heal <span className="text-emerald-400">{NATURAL_HEALING_RULES.hpPerLevelPerDay} HP per character level</span> per
                            full day of complete rest (8 hours).
                        </p>
                        <p>
                            With long-term care (Heal check DC {NATURAL_HEALING_RULES.healCheckDC}), healing
                            increases to <span className="text-emerald-400">{NATURAL_HEALING_RULES.hpPerLevelPerDay * NATURAL_HEALING_RULES.longTermCareMultiplier} HP per level</span> per day.
                        </p>
                        <p className="text-amber-400/80">
                            On Athas, natural healing is <span className="text-amber-300 font-semibold">halved</span> without
                            both adequate water and shade or shelter. The brutal sun and dehydration
                            impair the body&apos;s ability to recover.
                        </p>
                    </div>
                </details>
            </div>
        </div>
    );
}
