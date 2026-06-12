import React, { useState, useEffect, useMemo } from 'react';
import {
    abilityMod,
    ABILITY_DEFINITIONS,
    SAVE_DEFINITIONS,
    ELEMENTAL_PATRONS,
    SORCERER_KINGS,
    babForProgression,
    xpPenaltyPercent,
    formatClassLevels,
    getConditionPenalties,
    getHeatSicknessPenalties,
    getForcedMarchPenalties,
} from 'athas-shared';
import type { ClassEntry, ConditionPenaltySummary } from 'athas-shared';
import { api } from '@/lib/api';
import { LevelUpWizard } from './LevelUpWizard';

interface StatsTabProps {
    char: any;
    conditions: string[];
    handleNumericChange: (field: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    handleChange: (field: string, value: string | number) => void;
    syncField: (field: string, value: any) => void;
    syncFields: (updates: [string, any][]) => void;
    readOnly?: boolean;
}

/** Small inline tag showing a condition penalty/bonus next to a stat */
function PenaltyTag({ value, sources, label }: { value: number; sources?: string[]; label?: string }) {
    if (value === 0) return null;
    const isBonus = value > 0;
    const tooltip = sources?.length ? `${label || ''}: ${sources.join(', ')}`.trim() : undefined;
    return (
        <span
            className={`ml-1 px-1 py-0 rounded-sm text-xs font-mono font-bold ${
                isBonus
                    ? 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-400'
                    : 'bg-crimson/15 border border-crimson/30 text-crimson-light'
            }`}
            title={tooltip}
        >
            {isBonus ? `+${value}` : value}
        </span>
    );
}

export function StatsTab({ char, conditions, handleNumericChange, handleChange, syncField, syncFields, readOnly }: StatsTabProps) {
    const [showDetails, setShowDetails] = useState(true);
    const [showClassBreakdown, setShowClassBreakdown] = useState(false);
    const [showClassFeatures, setShowClassFeatures] = useState(true);
    const [showFeats, setShowFeats] = useState(true);

    // Class/race data for breakdown
    const [classDataMap, setClassDataMap] = useState<Record<string, any>>({});
    const [raceData, setRaceData] = useState<any>(null);

    // Fetch class data for all classes in classLevels
    useEffect(() => {
        const entries: ClassEntry[] = char.classLevels || [];
        if (entries.length === 0) return;
        const fetchAll = async () => {
            const map: Record<string, any> = {};
            for (const e of entries) {
                if (map[e.className]) continue;
                try {
                    const classId = e.className.toLowerCase().replace(/[- ]/g, '-');
                    const data = await api.get<any>(`/compendium/classes/${classId}`);
                    map[e.className] = data;
                } catch {}
            }
            setClassDataMap(map);
        };
        fetchAll();
    }, [char.classLevels]);

    // Fetch race data for XP penalty (favored class)
    useEffect(() => {
        if (!char.race) return;
        const raceId = char.race.toLowerCase().replace(/[- ]/g, '-');
        api.get<any>(`/compendium/races/${raceId}`).then(setRaceData).catch(() => {});
    }, [char.race]);

    const isMulticlass = (char.classLevels || []).length > 1;
    const hasClassLevels = (char.classLevels || []).length > 0;

    const abilities = ABILITY_DEFINITIONS;

    // ── Condition Penalties ──────────────────────────────────────────────────
    const condPenalties = useMemo(() => getConditionPenalties(conditions), [conditions]);
    const heatPenalties = useMemo(() => getHeatSicknessPenalties(char.heatSicknessStage || 0), [char.heatSicknessStage]);
    const marchPenalties = useMemo(() => getForcedMarchPenalties(char.forcedMarchStage || 0), [char.forcedMarchStage]);

    // Merge condition + heat + march penalties into a single effective summary
    const penalties = useMemo(() => {
        const merged = { ...condPenalties };
        // Merge heat penalties
        merged.attackRolls += heatPenalties.attackRolls;
        merged.saves += heatPenalties.saves;
        merged.skillChecks += heatPenalties.skillChecks;
        merged.abilityChecks += heatPenalties.abilityChecks;
        merged.ac += heatPenalties.ac;
        merged.damage += heatPenalties.damage;
        merged.initiative += heatPenalties.initiative;
        merged.str += heatPenalties.str;
        merged.dex += heatPenalties.dex;
        // Merge march penalties
        merged.attackRolls += marchPenalties.attackRolls;
        merged.saves += marchPenalties.saves;
        merged.skillChecks += marchPenalties.skillChecks;
        merged.abilityChecks += marchPenalties.abilityChecks;
        merged.ac += marchPenalties.ac;
        merged.damage += marchPenalties.damage;
        merged.initiative += marchPenalties.initiative;
        merged.str += marchPenalties.str;
        merged.dex += marchPenalties.dex;
        // Speed: worst wins (across all sources)
        for (const p of [heatPenalties, marchPenalties]) {
            if (p.speed === 'zero') merged.speed = 'zero';
            else if (p.speed === 'half' && merged.speed !== 'zero') merged.speed = 'half';
        }
        // Boolean OR
        for (const p of [heatPenalties, marchPenalties]) {
            if (p.loseDexToAC) merged.loseDexToAC = true;
            if (p.effectiveDex0) merged.effectiveDex0 = true;
            if (p.effectiveStr0) merged.effectiveStr0 = true;
            if (p.cantAct) merged.cantAct = true;
        }
        // Merge sources
        merged.sources = { ...merged.sources };
        for (const p of [heatPenalties, marchPenalties]) {
            for (const [key, srcs] of Object.entries(p.sources)) {
                merged.sources[key] = [...(merged.sources[key] || []), ...srcs];
            }
        }
        return merged;
    }, [condPenalties, heatPenalties, marchPenalties]);

    const hasAnyPenalty = (conditions.length > 0 || (char.heatSicknessStage || 0) > 0 || (char.forcedMarchStage || 0) > 0) && (
        penalties.str !== 0 || penalties.dex !== 0 || penalties.attackRolls !== 0 ||
        penalties.ac !== 0 || penalties.saves !== 0 || penalties.initiative !== 0 ||
        penalties.speed !== null || penalties.loseDexToAC || penalties.effectiveDex0 ||
        penalties.effectiveStr0 || penalties.damage !== 0
    );

    // Effective ability scores (display-only — raw scores stay untouched)
    const effectiveStr = penalties.effectiveStr0 ? 0 : Math.max(0, char.strength + penalties.str);
    const effectiveDex = penalties.effectiveDex0 ? 0 : Math.max(0, char.dexterity + penalties.dex);

    // Computed modifiers from effective scores
    const strMod = Math.floor((effectiveStr - 10) / 2);
    const dexMod = Math.floor((effectiveDex - 10) / 2);
    const conMod = Math.floor((char.constitution - 10) / 2);
    const sizeMod = char.acSizeMod || 0;

    // DEX contribution to AC: stripped if loseDexToAC or effectiveDex0
    const dexToAC = (penalties.loseDexToAC || penalties.effectiveDex0) ? 0 : dexMod;

    // AC computations (with condition penalties)
    const baseAC = 10 + (char.acArmor || 0) + (char.acShield || 0) + sizeMod + (char.acNatural || 0) + (char.acDeflection || 0) + (char.acMisc || 0);
    const totalAC = baseAC + dexToAC + penalties.ac;
    const touchAC = 10 + dexToAC + sizeMod + (char.acDeflection || 0) + (char.acMisc || 0) + penalties.ac;
    const flatFootedAC = 10 + (char.acArmor || 0) + (char.acShield || 0) + sizeMod + (char.acNatural || 0) + (char.acDeflection || 0) + (char.acMisc || 0) + penalties.ac;

    // Attack computations (with condition penalties)
    const bab = char.baseAttackBonus || 0;
    const meleeAttack = bab + strMod + sizeMod + penalties.attackRolls;
    const rangedAttack = bab + dexMod + sizeMod + penalties.attackRolls;
    const grappleSizeMod = sizeMod * -4;
    const grapple = bab + strMod + grappleSizeMod + penalties.attackRolls;

    // Speed (with condition penalties)
    const baseSpeed = char.speed || 0;
    const effectiveSpeed = penalties.speed === 'zero' ? 0
        : penalties.speed === 'half' ? Math.floor(baseSpeed / 2)
        : baseSpeed;

    // Initiative (with condition penalties)
    const effectiveInit = (char.initiative || 0) + penalties.initiative;

    // Deity/patron context
    const classLower = hasClassLevels
        ? (char.classLevels || []).map((e: ClassEntry) => e.className.toLowerCase()).join(' ')
        : (char.classLevel || '').toLowerCase();
    const isCleric = classLower.includes('cleric');
    const isTemplar = classLower.includes('templar');
    const isDruid = classLower.includes('druid');

    // XP penalty
    const xpPenalty = isMulticlass && raceData ? xpPenaltyPercent(char.classLevels, raceData.favoredClass || 'Any') : 0;

    const fmtMod = (n: number) => n >= 0 ? `+${n}` : `${n}`;

    return (
        <>
            {/* ── Condition Penalty Summary ── */}
            {hasAnyPenalty && (
                <div className="bg-crimson/8 border border-crimson/25 rounded-sm p-2 mb-1">
                    <div className="text-xs text-crimson-light font-display uppercase tracking-wider mb-1">
                        ⚠ {(() => {
                            const sources = [
                                conditions.length > 0 && 'Condition',
                                (char.heatSicknessStage || 0) > 0 && 'Heat',
                                (char.forcedMarchStage || 0) > 0 && 'March',
                            ].filter(Boolean);
                            return sources.length > 0 ? `${sources.join(' & ')} Penalties Active` : 'Penalties Active';
                        })()}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {penalties.str !== 0 && <span className="text-xs font-mono text-crimson-light/80">STR {penalties.str > 0 ? '+' : ''}{penalties.str}</span>}
                        {penalties.dex !== 0 && <span className="text-xs font-mono text-crimson-light/80">DEX {penalties.dex > 0 ? '+' : ''}{penalties.dex}</span>}
                        {penalties.effectiveStr0 && <span className="text-xs font-mono text-crimson-light/80">STR→0</span>}
                        {penalties.effectiveDex0 && <span className="text-xs font-mono text-crimson-light/80">DEX→0</span>}
                        {penalties.attackRolls !== 0 && <span className="text-xs font-mono text-crimson-light/80">Atk {penalties.attackRolls > 0 ? '+' : ''}{penalties.attackRolls}</span>}
                        {penalties.ac !== 0 && <span className="text-xs font-mono text-crimson-light/80">AC {penalties.ac}</span>}
                        {(penalties.loseDexToAC && !penalties.effectiveDex0) && <span className="text-xs font-mono text-crimson-light/80">No DEX→AC</span>}
                        {penalties.saves !== 0 && <span className="text-xs font-mono text-crimson-light/80">Saves {penalties.saves}</span>}
                        {penalties.speed !== null && <span className="text-xs font-mono text-crimson-light/80">Speed {penalties.speed === 'zero' ? '→0' : '½'}</span>}
                        {penalties.initiative !== 0 && <span className="text-xs font-mono text-crimson-light/80">Init {penalties.initiative}</span>}
                        {penalties.damage !== 0 && <span className="text-xs font-mono text-crimson-light/80">Dmg {penalties.damage}</span>}
                    </div>
                </div>
            )}

            {/* ── Character Details ── */}
            <div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-sm text-obsidian-500 uppercase tracking-wider mb-1 hover:text-obsidian-300 transition-colors"
                >
                    <span className="text-xs">{showDetails ? '▼' : '▶'}</span>
                    Character Details
                </button>
                {showDetails && (
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                        <div className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5">
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider mb-0.5">Gender</div>
                            <input type="text" value={char.gender || ''} onChange={(e) => handleChange('gender', e.target.value)}
                                readOnly={readOnly} placeholder="—"
                                className="w-full text-xs text-sand-200 bg-transparent focus:outline-none placeholder-obsidian-600" />
                        </div>
                        <div className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5">
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider mb-0.5">Age</div>
                            <input type="text" value={char.age || ''} onChange={(e) => handleChange('age', e.target.value)}
                                readOnly={readOnly} placeholder="—"
                                className="w-full text-xs text-sand-200 bg-transparent focus:outline-none placeholder-obsidian-600" />
                        </div>
                        <div className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5">
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider mb-0.5">Height</div>
                            <input type="text" value={char.height || ''} onChange={(e) => handleChange('height', e.target.value)}
                                readOnly={readOnly} placeholder="—"
                                className="w-full text-xs text-sand-200 bg-transparent focus:outline-none placeholder-obsidian-600" />
                        </div>
                        <div className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5">
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider mb-0.5">Weight</div>
                            <input type="text" value={char.weight || ''} onChange={(e) => handleChange('weight', e.target.value)}
                                readOnly={readOnly} placeholder="—"
                                className="w-full text-xs text-sand-200 bg-transparent focus:outline-none placeholder-obsidian-600" />
                        </div>
                        <div className="col-span-2 bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5">
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider mb-0.5">
                                {isCleric ? 'Element' : isTemplar ? 'Sorcerer-King' : isDruid ? 'Patron' : 'Deity/Patron'}
                            </div>
                            {isCleric ? (
                                <select value={char.deity || ''} onChange={(e) => handleChange('deity', e.target.value)}
                                    disabled={readOnly}
                                    className="w-full text-xs text-sand-200 bg-obsidian-800 focus:outline-none">
                                    <option value="">Select Element</option>
                                    {ELEMENTAL_PATRONS.map((e: string) => <option key={e} value={e}>{e}</option>)}
                                </select>
                            ) : isTemplar ? (
                                <select value={char.deity || ''} onChange={(e) => handleChange('deity', e.target.value)}
                                    disabled={readOnly}
                                    className="w-full text-xs text-sand-200 bg-obsidian-800 focus:outline-none">
                                    <option value="">Select Sorcerer-King</option>
                                    {SORCERER_KINGS.map((sk: any) => <option key={sk.name} value={sk.name}>{sk.name} — {sk.city}</option>)}
                                </select>
                            ) : isDruid ? (
                                <div className="text-xs text-sand-400 italic">The Land</div>
                            ) : (
                                <input type="text" value={char.deity || ''} onChange={(e) => handleChange('deity', e.target.value)}
                                    readOnly={readOnly} placeholder="—"
                                    className="w-full text-xs text-sand-200 bg-transparent focus:outline-none placeholder-obsidian-600" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Ability Scores */}
            <div className="grid grid-cols-3 gap-1.5">
                {abilities.map((ab) => {
                    const rawScore = char[ab.key];
                    const penaltyKey = ab.key === 'strength' ? 'str' : ab.key === 'dexterity' ? 'dex' : null;
                    const isStr0 = ab.key === 'strength' && penalties.effectiveStr0;
                    const isDex0 = ab.key === 'dexterity' && penalties.effectiveDex0;
                    const penaltyVal = penaltyKey ? (penalties as any)[penaltyKey] as number : 0;
                    const hasPenalty = isStr0 || isDex0 || penaltyVal !== 0;
                    const effectiveScore = isStr0 ? 0 : isDex0 ? 0 : rawScore + penaltyVal;
                    const effectiveMod = Math.floor((effectiveScore - 10) / 2);
                    return (
                        <div key={ab.key} className={`bg-obsidian-800 border rounded-sm p-1.5 text-center ${
                            hasPenalty ? 'border-crimson/40' : 'border-obsidian-700'
                        }`}>
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider">{ab.label}</div>
                            <input
                                type="number"
                                value={rawScore}
                                onChange={(e) => handleNumericChange(ab.key, e)}
                                readOnly={readOnly}
                                className={`w-full text-center text-lg font-bold bg-transparent focus:outline-none ${
                                    hasPenalty ? 'text-crimson-light' : 'text-sand-200'
                                }`}
                            />
                            {hasPenalty ? (
                                <div className="text-xs font-mono">
                                    <span className="text-crimson-light/60 line-through">{abilityMod(rawScore)}</span>
                                    <span className="text-crimson-light ml-1">{effectiveMod >= 0 ? `+${effectiveMod}` : effectiveMod}</span>
                                    {(isStr0 || isDex0) && <span className="text-crimson-light/50 text-xs ml-0.5">(eff 0)</span>}
                                </div>
                            ) : (
                                <div className="text-xs text-sand-500 font-mono">{abilityMod(rawScore)}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Armor Class ── */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-obsidian-500 uppercase tracking-wider">Armor Class</span>
                    {(penalties.ac !== 0 || penalties.loseDexToAC || penalties.effectiveDex0) && (
                        <span className="text-xs text-crimson-light/70 font-mono">
                            {penalties.loseDexToAC && !penalties.effectiveDex0 ? '(no DEX)' : ''}
                            {penalties.effectiveDex0 ? '(DEX 0)' : ''}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                    <div className={`bg-obsidian-800 border rounded-sm p-1.5 text-center ${
                        (penalties.ac !== 0 || penalties.loseDexToAC || penalties.effectiveDex0) ? 'border-crimson/40' : 'border-sand-700/50'
                    }`}>
                        <div className="text-xs text-sand-500 uppercase tracking-wider">Total</div>
                        <div className="text-xl font-bold text-sand-200">
                            {totalAC}
                            <PenaltyTag value={penalties.ac} sources={penalties.sources['ac']} label="AC" />
                        </div>
                    </div>
                    <div className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5 text-center">
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">Touch</div>
                        <div className="text-lg font-bold text-obsidian-300">{touchAC}</div>
                    </div>
                    <div className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5 text-center">
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">Flat-Foot</div>
                        <div className="text-lg font-bold text-obsidian-300">{flatFootedAC}</div>
                    </div>
                </div>
                {/* AC Components */}
                <div className="grid grid-cols-4 gap-1 mb-1">
                    {[
                        { key: 'acArmor', label: 'Armor' },
                        { key: 'acShield', label: 'Shield' },
                        { key: 'acNatural', label: 'Natural' },
                        { key: 'acDeflection', label: 'Defl' },
                    ].map((comp) => (
                        <div key={comp.key} className="bg-obsidian-800/60 border border-obsidian-700/50 rounded-sm p-1 text-center">
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider">{comp.label}</div>
                            <input
                                type="number"
                                value={char[comp.key] || 0}
                                onChange={(e) => handleNumericChange(comp.key, e)}
                                readOnly={readOnly}
                                className="w-full text-center text-sm font-bold text-sand-200 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-1">
                    <div className="bg-obsidian-800/60 border border-obsidian-700/50 rounded-sm p-1 text-center">
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">DEX</div>
                        <div className={`text-sm font-bold font-mono ${
                            (penalties.loseDexToAC || penalties.effectiveDex0) ? 'text-crimson-light' : 'text-sand-400'
                        }`}>
                            {fmtMod(dexToAC)}
                            {(penalties.loseDexToAC || penalties.effectiveDex0) && (
                                <span className="text-xs text-crimson-light/50 ml-0.5">⊘</span>
                            )}
                        </div>
                    </div>
                    <div className="bg-obsidian-800/60 border border-obsidian-700/50 rounded-sm p-1 text-center">
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">Size</div>
                        <input
                            type="number"
                            value={char.acSizeMod || 0}
                            onChange={(e) => handleNumericChange('acSizeMod', e)}
                            readOnly={readOnly}
                            className="w-full text-center text-sm font-bold text-sand-200 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                    <div className="bg-obsidian-800/60 border border-obsidian-700/50 rounded-sm p-1 text-center">
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">Misc</div>
                        <input
                            type="number"
                            value={char.acMisc || 0}
                            onChange={(e) => handleNumericChange('acMisc', e)}
                            readOnly={readOnly}
                            className="w-full text-center text-sm font-bold text-sand-200 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </div>
            </div>

            {/* ── Attack Bonuses ── */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-obsidian-500 uppercase tracking-wider">Attack Bonuses</span>
                    {penalties.attackRolls !== 0 && (
                        <PenaltyTag value={penalties.attackRolls} sources={penalties.sources['attackRolls']} label="Attack" />
                    )}
                    {penalties.damage !== 0 && (
                        <span className="text-xs font-mono text-crimson-light/70">Dmg {penalties.damage > 0 ? '+' : ''}{penalties.damage}</span>
                    )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1.5 text-center">
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">BAB</div>
                        <input
                            type="number"
                            value={char.baseAttackBonus}
                            onChange={(e) => handleNumericChange('baseAttackBonus', e)}
                            readOnly={readOnly}
                            className="w-full text-center text-lg font-bold text-sand-200 bg-transparent focus:outline-none"
                        />
                    </div>
                    <div className={`bg-obsidian-800 border rounded-sm p-1.5 text-center ${
                        penalties.attackRolls !== 0 ? 'border-crimson/40' : 'border-obsidian-700'
                    }`}>
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">Melee</div>
                        <div className={`text-lg font-bold font-mono ${meleeAttack >= 0 ? 'text-sand-300' : 'text-crimson-light'}`}>
                            {fmtMod(meleeAttack)}
                        </div>
                        <div className="text-xs text-obsidian-600">BAB+STR+Size</div>
                    </div>
                    <div className={`bg-obsidian-800 border rounded-sm p-1.5 text-center ${
                        penalties.attackRolls !== 0 ? 'border-crimson/40' : 'border-obsidian-700'
                    }`}>
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">Ranged</div>
                        <div className={`text-lg font-bold font-mono ${rangedAttack >= 0 ? 'text-sand-300' : 'text-crimson-light'}`}>
                            {fmtMod(rangedAttack)}
                        </div>
                        <div className="text-xs text-obsidian-600">BAB+DEX+Size</div>
                    </div>
                    <div className={`bg-obsidian-800 border rounded-sm p-1.5 text-center ${
                        penalties.attackRolls !== 0 ? 'border-crimson/40' : 'border-obsidian-700'
                    }`}>
                        <div className="text-xs text-obsidian-500 uppercase tracking-wider">Grapple</div>
                        <div className={`text-lg font-bold font-mono ${grapple >= 0 ? 'text-sand-300' : 'text-crimson-light'}`}>
                            {fmtMod(grapple)}
                        </div>
                        <div className="text-xs text-obsidian-600">BAB+STR+Size</div>
                    </div>
                </div>
            </div>

            {/* Saves */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-obsidian-500 uppercase tracking-wider">Saving Throws</span>
                    {penalties.saves !== 0 && (
                        <PenaltyTag value={penalties.saves} sources={penalties.sources['saves']} label="Saves" />
                    )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {SAVE_DEFINITIONS.map((save) => {
                        const baseVal = char[save.key] || 0;
                        const effectiveVal = baseVal + penalties.saves;
                        const hasSavePenalty = penalties.saves !== 0;
                        return (
                            <div key={save.key} className={`bg-obsidian-800 border rounded-sm p-1.5 text-center ${
                                hasSavePenalty ? 'border-crimson/40' : 'border-obsidian-700'
                            }`}>
                                <div className="text-xs text-obsidian-500 uppercase tracking-wider">{save.label}</div>
                                <input
                                    type="number"
                                    value={baseVal}
                                    onChange={(e) => handleNumericChange(save.key, e)}
                                    readOnly={readOnly}
                                    className="w-full text-center text-base font-bold text-sand-200 bg-transparent focus:outline-none"
                                />
                                {hasSavePenalty && (
                                    <div className="text-xs font-mono text-crimson-light/70">eff {fmtMod(effectiveVal)}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Speed & Initiative */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-obsidian-500 uppercase tracking-wider">Speed</span>
                    {penalties.speed !== null ? (
                        <>
                            <span className="text-sm text-crimson-light font-bold font-mono">{effectiveSpeed}</span>
                            <span className="text-xs text-crimson-light/50 line-through font-mono">{baseSpeed}</span>
                            <span className="text-xs text-obsidian-500">ft.</span>
                        </>
                    ) : (
                        <>
                            <input
                                type="number"
                                value={char.speed}
                                onChange={(e) => handleNumericChange('speed', e)}
                                readOnly={readOnly}
                                className="w-16 px-2 py-0.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                            />
                            <span className="text-xs text-obsidian-500">ft.</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-obsidian-500 uppercase tracking-wider">Init</span>
                    {penalties.initiative !== 0 ? (
                        <>
                            <span className="text-sm text-crimson-light font-bold font-mono">{fmtMod(effectiveInit)}</span>
                            <span className="text-xs text-crimson-light/50 line-through font-mono">{fmtMod(char.initiative || 0)}</span>
                        </>
                    ) : (
                        <input
                            type="number"
                            value={char.initiative}
                            onChange={(e) => handleNumericChange('initiative', e)}
                            readOnly={readOnly}
                            className="w-16 px-2 py-0.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                        />
                    )}
                </div>
            </div>

            {/* ── Currency ── */}
            <div className="mt-2">
                <span className="text-sm text-obsidian-500 uppercase tracking-wider font-display">Currency</span>
                <div className="grid grid-cols-4 gap-1 mt-1">
                    {[
                        { field: 'currencyCp', label: 'Ceramic', icon: '🏺' },
                        { field: 'currencySp', label: 'Silver', icon: '🥈' },
                        { field: 'currencyGp', label: 'Gold', icon: '🥇' },
                        { field: 'currencyBits', label: 'Bits', icon: '⚙️' },
                    ].map(({ field, label, icon }) => (
                        <div key={field} className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1 text-center">
                            <span className="text-xs">{icon}</span>
                            <input
                                type="number"
                                min={0}
                                value={(char as any)[field] || 0}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) handleChange(field, val);
                                }}
                                className="w-full bg-transparent text-center text-sm font-mono text-sand-200 focus:outline-none focus:text-sand-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                readOnly={readOnly}
                            />
                            <span className="text-xs text-obsidian-500 uppercase">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Class Breakdown (multiclass) ── */}
            {hasClassLevels && (
                <div>
                    <button
                        onClick={() => setShowClassBreakdown(!showClassBreakdown)}
                        className="flex items-center gap-1 text-sm text-obsidian-500 uppercase tracking-wider mb-1 hover:text-obsidian-300 transition-colors"
                    >
                        <span className="text-xs">{showClassBreakdown ? '▼' : '▶'}</span>
                        Class Breakdown
                        {isMulticlass && <span className="text-xs text-violet-400 ml-1">MULTICLASS</span>}
                    </button>
                    {showClassBreakdown && (
                        <div className="space-y-1 mb-2">
                            {(char.classLevels || []).map((entry: ClassEntry, i: number) => {
                                const cd = classDataMap[entry.className];
                                return (
                                    <div key={i} className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs text-sand-300 font-display">{entry.className} {entry.level}</span>
                                            {cd && (
                                                <span className="text-xs text-obsidian-400 ml-2 font-mono">
                                                    d{cd.hitDie} • BAB +{babForProgression(cd.babProgression, entry.level)}
                                                    {cd.goodSaves.length > 0 && ` • ${cd.goodSaves.map((s: string) => s.toUpperCase()).join('/')} good`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {xpPenalty > 0 && (
                                <div className="bg-crimson/10 border border-crimson/30 rounded-sm p-1.5 flex items-center gap-1">
                                    <span className="text-xs text-crimson-light font-display">⚠ −{xpPenalty}% XP Penalty</span>
                                    <span className="text-xs text-obsidian-400">(uneven class levels)</span>
                                </div>
                            )}
                        </div>
                    )}
                    <LevelUpWizard
                        char={char}
                        syncFields={syncFields}
                        classDataMap={classDataMap}
                        setClassDataMap={setClassDataMap}
                        readOnly={readOnly}
                    />
                </div>
            )}

            {/* ── Class Features ── */}
            {(char.classFeatures || []).length > 0 && (
                <div>
                    <button
                        onClick={() => setShowClassFeatures(!showClassFeatures)}
                        className="flex items-center gap-1 text-sm text-obsidian-500 uppercase tracking-wider mb-1 hover:text-obsidian-300 transition-colors"
                    >
                        <span className="text-xs">{showClassFeatures ? '▼' : '▶'}</span>
                        Class Features
                        <span className="text-xs text-amber-500 ml-1">{(char.classFeatures || []).length}</span>
                    </button>
                    {showClassFeatures && (
                        <div className="space-y-1 mb-2">
                            {(() => {
                                const grouped: Record<string, any[]> = {};
                                for (const f of (char.classFeatures || [])) {
                                    const cls = f.className || 'General';
                                    if (!grouped[cls]) grouped[cls] = [];
                                    grouped[cls].push(f);
                                }
                                return Object.entries(grouped).map(([cls, features]) => (
                                    <div key={cls}>
                                        {Object.keys(grouped).length > 1 && (
                                            <div className="text-xs text-violet-400 font-display uppercase tracking-wider mt-1 mb-0.5">{cls}</div>
                                        )}
                                        {features.map((f: any, i: number) => {
                                            const entry = (char.classLevels || []).find((e: ClassEntry) => e.className === cls);
                                            const isCurrentLevel = entry && f.level === entry.level;
                                            const scalingValue = f.scaling && entry ? f.scaling.find((s: any) => s.level === entry.level)?.value : null;
                                            return (
                                                <div key={`${cls}-${i}`} className={`bg-obsidian-800/50 border rounded-sm p-1.5 ${isCurrentLevel ? 'border-amber-700/50' : 'border-obsidian-700/50'}`}>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-sand-300 font-display font-semibold">{f.name}</span>
                                                        <span className="text-xs text-obsidian-500 font-mono">Lvl {f.level}</span>
                                                        {isCurrentLevel && <span className="text-xs">✨</span>}
                                                        {scalingValue && <span className="text-xs text-amber-400 font-mono ml-auto">{scalingValue}</span>}
                                                    </div>
                                                    {f.description && (
                                                        <p className="text-xs text-obsidian-400 mt-0.5 leading-relaxed">{f.description}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* ── Feats ── */}
            {(char.feats || []).length > 0 && (
                <div>
                    <button
                        onClick={() => setShowFeats(!showFeats)}
                        className="flex items-center gap-1 text-sm text-obsidian-500 uppercase tracking-wider mb-1 hover:text-obsidian-300 transition-colors"
                    >
                        <span className="text-xs">{showFeats ? '▼' : '▶'}</span>
                        Feats
                        <span className="text-xs text-amber-500 ml-1">{(char.feats || []).length}</span>
                    </button>
                    {showFeats && (
                        <div className="space-y-1 mb-2">
                            {(char.feats || []).map((feat: any, i: number) => (
                                <div key={i} className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5 flex items-start justify-between gap-1">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-sand-300 font-display font-semibold">{feat.name}</div>
                                        {feat.description && (
                                            <p className="text-xs text-obsidian-400 mt-0.5 leading-relaxed line-clamp-2">{feat.description}</p>
                                        )}
                                    </div>
                                    {!readOnly && (
                                        <button
                                            onClick={() => {
                                                const updated = (char.feats || []).filter((_: any, idx: number) => idx !== i);
                                                syncField('feats', updated);
                                            }}
                                            className="text-xs text-obsidian-600 hover:text-crimson-light transition-colors shrink-0 mt-0.5"
                                            title="Remove feat"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
