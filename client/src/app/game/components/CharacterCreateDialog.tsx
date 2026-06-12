'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '@/hooks/useModal';
import { DARK_SUN_RACES, DARK_SUN_CLASSES, ABILITY_DEFINITIONS, SAVE_DEFINITIONS, abilityMod, getSizeModAC } from 'athas-shared';
import { api } from '@/lib/api';

interface CharacterCreateDialogProps {
    onClose: () => void;
    onCreate: (data: any) => void;
}

export function CharacterCreateDialog({ onClose, onCreate }: CharacterCreateDialogProps) {
    const { modalRef } = useModal(true, onClose);
    const [form, setForm] = useState({
        name: '',
        race: 'Human',
        classLevel: 'Fighter',
        level: 1,
        alignment: 'True Neutral',
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        hitPointsMax: 10,
        hitPointsCurrent: 10,
        armorClass: 10,
        baseAttackBonus: 0,
        initiative: 0,
        speed: 30,
        saveFort: 0,
        saveRef: 0,
        saveWill: 0,
        pspMax: 0,
        pspCurrent: 0,
        acSizeMod: 0,
        deity: '',
    });

    const [raceData, setRaceData] = useState<any | null>(null);
    const [classData, setClassData] = useState<any | null>(null);
    const prevRaceAdjRef = useRef<Record<string, number>>({});

    // ── Dice Roller State ──
    const [rolling, setRolling] = useState(false);
    const [rollDisplay, setRollDisplay] = useState<Record<string, number[]>>({});
    const [rollingAbility, setRollingAbility] = useState<string | null>(null);

    // ── Wild Talent State ──
    const [wildTalent, setWildTalent] = useState<any | null>(null);
    const [wildTalentPool, setWildTalentPool] = useState<any[]>([]);
    const [rollingTalent, setRollingTalent] = useState(false);

    // 4d6 drop lowest helper
    const roll4d6DropLowest = (): { total: number; dice: number[] } => {
        const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
        dice.sort((a, b) => a - b);
        const total = dice[1] + dice[2] + dice[3];
        return { total, dice };
    };

    const rollAllAbilities = () => {
        setRolling(true);
        const abilityKeys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

        let ticks = 0;
        const maxTicks = 15;
        const interval = setInterval(() => {
            ticks++;
            const tempDisplay: Record<string, number[]> = {};
            abilityKeys.forEach(ab => {
                tempDisplay[ab] = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
            });
            setRollDisplay(tempDisplay);

            if (ticks >= maxTicks) {
                clearInterval(interval);
                const finalDisplay: Record<string, number[]> = {};
                abilityKeys.forEach(ab => {
                    const { total, dice } = roll4d6DropLowest();
                    finalDisplay[ab] = dice;
                    setField(ab, total);
                });
                setRollDisplay(finalDisplay);
                setRolling(false);
            }
        }, 100);
    };

    const rollSingleAbility = (abilityKey: string) => {
        setRollingAbility(abilityKey);
        let tick = 0;
        const maxTicks = 6;
        const doTick = () => {
            tick++;
            setRollDisplay(prev => ({
                ...prev,
                [abilityKey]: Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1),
            }));
            if (tick >= maxTicks) {
                const { total, dice } = roll4d6DropLowest();
                setRollDisplay(prev => ({ ...prev, [abilityKey]: dice }));
                setField(abilityKey, total);
                setRollingAbility(null);
                return;
            }
            setTimeout(doTick, 60 + tick * 20);
        };
        doTick();
    };

    // Fetch wild talent pool
    useEffect(() => {
        api.get<any>('/compendium/psionics?level=1&pageSize=100').then(data => {
            setWildTalentPool(data.results || []);
        }).catch(() => {});
    }, []);

    const rollWildTalent = () => {
        if (wildTalentPool.length === 0) return;
        setRollingTalent(true);

        let tick = 0;
        const maxTicks = 20;

        const doTick = () => {
            tick++;
            const randomIndex = Math.floor(Math.random() * wildTalentPool.length);
            setWildTalent(wildTalentPool[randomIndex]);

            if (tick >= maxTicks) {
                setRollingTalent(false);
                return;
            }
            setTimeout(doTick, 60 + tick * 15);
        };
        doTick();
    };

    // Fetch race data when race changes
    useEffect(() => {
        const raceId = form.race.toLowerCase().replace(/[- ]/g, '-');
        api.get<any>(`/compendium/races/${raceId}`).then(data => {
            // Undo previous race adjustments
            const prev = prevRaceAdjRef.current;
            const newAdj = data.abilityAdjustments || {};
            setForm(f => {
                const updated = { ...f };
                // Undo old
                for (const [key, val] of Object.entries(prev)) {
                    (updated as any)[key] = (updated as any)[key] - (val as number);
                }
                // Apply new
                for (const [key, val] of Object.entries(newAdj)) {
                    (updated as any)[key] = (updated as any)[key] + (val as number);
                }
                // Apply racial speed
                updated.speed = data.speed;
                // Apply racial size modifier for AC
                updated.acSizeMod = getSizeModAC(data.size || 'Medium');
                return updated;
            });
            prevRaceAdjRef.current = newAdj;
            setRaceData(data);
        }).catch(() => setRaceData(null));
    }, [form.race]);

    // Fetch class data when class changes
    useEffect(() => {
        const classId = form.classLevel.toLowerCase().replace(/[- ]/g, '-');
        api.get<any>(`/compendium/classes/${classId}`).then(data => {
            setClassData(data);
            setForm(f => {
                const conMod = Math.floor((f.constitution - 10) / 2);
                const level = f.level;
                // HP = hitDie + CON mod at level 1
                const hp = Math.max(1, data.hitDie + conMod);
                // BAB
                let bab = 0;
                if (data.babProgression === 'full') bab = level;
                else if (data.babProgression === 'three_quarter') bab = Math.floor(level * 3 / 4);
                else bab = Math.floor(level / 2);
                // Saves
                const goodSaves: string[] = data.goodSaves || [];
                const goodSave = (lvl: number) => 2 + Math.floor(lvl / 2);
                const poorSave = (lvl: number) => Math.floor(lvl / 3);
                const fort = goodSaves.includes('fort') ? goodSave(level) : poorSave(level);
                const ref = goodSaves.includes('ref') ? goodSave(level) : poorSave(level);
                const will = goodSaves.includes('will') ? goodSave(level) : poorSave(level);

                return {
                    ...f,
                    hitPointsMax: hp,
                    hitPointsCurrent: hp,
                    baseAttackBonus: bab,
                    initiative: Math.floor((f.dexterity - 10) / 2),
                    saveFort: fort + Math.floor((f.constitution - 10) / 2),
                    saveRef: ref + Math.floor((f.dexterity - 10) / 2),
                    saveWill: will + Math.floor((f.wisdom - 10) / 2),
                };
            });
            // Auto-set deity for druids
            const classLower = form.classLevel.toLowerCase();
            if (classLower.includes('druid')) {
                setForm(f => ({ ...f, deity: 'The Land' }));
            } else {
                setForm(f => f.deity === 'The Land' ? { ...f, deity: '' } : f);
            }
        }).catch(() => setClassData(null));
    }, [form.classLevel]);

    const setField = (field: string, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        const characterData = {
            ...form,
            classLevels: JSON.stringify([{ className: form.classLevel, level: form.level }]),
            ...(wildTalent ? {
                powers: JSON.stringify([{
                    id: wildTalent.id,
                    name: wildTalent.name,
                    discipline: wildTalent.discipline,
                    level: wildTalent.level,
                    cost: wildTalent.cost,
                    description: wildTalent.description,
                    augments: wildTalent.augments || '',
                    display: wildTalent.display || '',
                    range: wildTalent.range || '',
                    duration: wildTalent.duration || '',
                    savingThrow: wildTalent.savingThrow || '',
                    powerResistance: wildTalent.powerResistance || '',
                }]),
            } : {}),
        };
        onCreate(characterData);
    };

    const abilities = ABILITY_DEFINITIONS;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-dialog-title"
                className="bg-obsidian-900 border border-obsidian-600 rounded-sm shadow-2xl shadow-black/50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-obsidian-700 flex justify-between items-center sticky top-0 bg-obsidian-900 z-10">
                    <h2 id="create-dialog-title" className="font-display text-lg text-sand-300 tracking-wider">⚔️ Create Character</h2>
                    <button onClick={onClose} aria-label="Close" className="text-obsidian-400 hover:text-sand-300 text-xl transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Character Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setField('name', e.target.value)}
                            className="w-full px-3 py-2 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 placeholder-obsidian-500 focus:outline-none focus:border-sand-500"
                            placeholder="Rikus of Tyr"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Race & Class */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Race</label>
                            <select
                                value={form.race}
                                onChange={(e) => setField('race', e.target.value)}
                                className="w-full px-3 py-2 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 focus:outline-none focus:border-sand-500"
                            >
                                {DARK_SUN_RACES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Class</label>
                            <select
                                value={form.classLevel}
                                onChange={(e) => setField('classLevel', e.target.value)}
                                className="w-full px-3 py-2 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 focus:outline-none focus:border-sand-500"
                            >
                                {DARK_SUN_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {raceData && (
                        <div className="col-span-2 bg-obsidian-800/50 border border-obsidian-700 rounded-sm p-2 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-sand-500 font-display uppercase tracking-wider">Racial Traits</span>
                                <span className="text-xs text-obsidian-500">{raceData.size} • Speed {raceData.speed} ft.</span>
                                {Object.keys(raceData.abilityAdjustments).length > 0 && (
                                    <span className="text-xs text-obsidian-400 font-mono">
                                        {Object.entries(raceData.abilityAdjustments).map(([k, v]: [string, any]) =>
                                            `${v > 0 ? '+' : ''}${v} ${k.substring(0, 3).toUpperCase()}`
                                        ).join(', ')}
                                    </span>
                                )}
                            </div>
                            <ul className="text-sm text-obsidian-400 space-y-0.5">
                                {raceData.traits.map((t: string, i: number) => (
                                    <li key={i} className="flex gap-1">
                                        <span className="text-sand-600 shrink-0">•</span>
                                        <span>{t}</span>
                                    </li>
                                ))}
                            </ul>
                            {raceData.darkSunNotes && (
                                <p className="text-xs text-sand-600/70 italic border-t border-obsidian-700/50 pt-1">
                                    ☀ {raceData.darkSunNotes}
                                </p>
                            )}
                        </div>
                    )}

                    {classData && (
                        <div className="bg-obsidian-800/50 border border-obsidian-700 rounded-sm p-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-sand-500 font-display uppercase tracking-wider">Class Info</span>
                                <span className="text-xs text-obsidian-400 font-mono">
                                    d{classData.hitDie} HD • {classData.skillPointsPerLevel}+INT skills/lvl
                                </span>
                            </div>
                            {classData.darkSunNotes && (
                                <p className="text-xs text-sand-600/70 italic mt-1">
                                    ☀ {classData.darkSunNotes}
                                </p>
                            )}
                        </div>
                    )}


                    {/* Level & Alignment */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Level</label>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={form.level}
                                onChange={(e) => setField('level', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 focus:outline-none focus:border-sand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Alignment</label>
                            <select
                                value={form.alignment}
                                onChange={(e) => setField('alignment', e.target.value)}
                                className="w-full px-3 py-2 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 focus:outline-none focus:border-sand-500"
                            >
                                {['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'].map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Ability Scores */}
                    <div>
                        <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1.5">Ability Scores</label>

                        {/* 🎲 Roll All Abilities Button */}
                        <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    type="button"
                                    onClick={rollAllAbilities}
                                    disabled={rolling}
                                    className={`flex-1 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm transition-all duration-200 ${
                                        rolling
                                            ? 'bg-obsidian-700 text-obsidian-400 cursor-wait'
                                            : 'bg-gradient-to-r from-amber-700 to-yellow-600 text-obsidian-950 hover:from-amber-600 hover:to-yellow-500 shadow-lg shadow-amber-500/20'
                                    }`}
                                >
                                    {rolling ? '🎲 Rolling...' : '🎲 Roll Abilities (4d6 drop lowest)'}
                                </button>
                            </div>
                            {/* Show dice results if we have them */}
                            {Object.keys(rollDisplay).length > 0 && (
                                <div className="grid grid-cols-6 gap-1 mb-1">
                                    {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ab => (
                                        <div key={ab} className="text-center">
                                            <div className="flex justify-center gap-0.5">
                                                {(rollDisplay[ab] || []).map((d, i) => {
                                                    const sorted = [...(rollDisplay[ab] || [])].sort((a, b) => a - b);
                                                    const isDropped = !rolling && !rollingAbility && i === (rollDisplay[ab] || []).indexOf(sorted[0]);
                                                    return (
                                                        <span
                                                            key={i}
                                                            className={`text-xs font-mono w-4 h-4 flex items-center justify-center rounded-sm ${
                                                                isDropped
                                                                    ? 'bg-red-900/40 text-red-400 line-through'
                                                                    : 'bg-obsidian-700 text-sand-300'
                                                            } ${(rolling || rollingAbility === ab) ? 'animate-pulse' : ''}`}
                                                        >
                                                            {d}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {abilities.map((ab) => (
                                <div key={ab.key} className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-2 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                        <span className="text-xs text-obsidian-500 uppercase tracking-wider">{ab.label}</span>
                                        <button
                                            type="button"
                                            onClick={() => rollSingleAbility(ab.key)}
                                            disabled={rolling || rollingAbility !== null}
                                            className="text-xs text-obsidian-500 hover:text-amber-400 transition-colors disabled:opacity-30"
                                            title={`Re-roll ${ab.label}`}
                                        >
                                            🎲
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={form[ab.key as keyof typeof form]}
                                        onChange={(e) => setField(ab.key, parseInt(e.target.value) || 10)}
                                        className="w-full text-center text-lg font-bold text-sand-200 bg-transparent focus:outline-none"
                                    />
                                    <div className="text-xs text-sand-500 font-mono">{abilityMod(Number(form[ab.key as keyof typeof form]))}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Combat Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { key: 'hitPointsMax', label: 'HP Max' },
                            { key: 'armorClass', label: 'AC' },
                            { key: 'speed', label: 'Speed' },
                        ].map((stat) => (
                            <div key={stat.key}>
                                <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">{stat.label}</label>
                                <input
                                    type="number"
                                    value={form[stat.key as keyof typeof form]}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setField(stat.key, val);
                                        if (stat.key === 'hitPointsMax') setField('hitPointsCurrent', val);
                                    }}
                                    className="w-full px-2 py-1.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Saves */}
                    <div className="grid grid-cols-3 gap-2">
                        {SAVE_DEFINITIONS.map((save) => (
                            <div key={save.key}>
                                <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">{save.label}</label>
                                <input
                                    type="number"
                                    value={form[save.key as keyof typeof form]}
                                    onChange={(e) => setField(save.key, parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                                />
                            </div>
                        ))}
                    </div>

                    {/* PSP (for psionic classes) */}
                    <div>
                        <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Power Points (PSP)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                min={0}
                                value={form.pspMax}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setField('pspMax', val);
                                    setField('pspCurrent', val);
                                }}
                                placeholder="Max PSP"
                                className="w-full px-2 py-1.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center placeholder-obsidian-500 focus:outline-none focus:border-sand-500"
                            />
                            <div className="flex items-center text-xs text-obsidian-500 px-2">
                                All classes have wild talent PSP in Dark Sun
                            </div>
                        </div>
                    </div>

                    {/* ── Wild Talent ── */}
                    <div className="mt-3 border-t border-obsidian-700 pt-2">
                        <span className="text-sm text-obsidian-500 uppercase tracking-wider font-display">Wild Talent</span>
                        <p className="text-xs text-obsidian-400 mt-0.5 mb-1">
                            Every Athasian character receives one random psionic wild talent at creation.
                        </p>

                        <button
                            type="button"
                            onClick={rollWildTalent}
                            disabled={rollingTalent || wildTalentPool.length === 0}
                            className={`w-full py-1.5 text-sm font-display uppercase tracking-wider rounded-sm transition-all duration-200 mb-1 ${
                                rollingTalent
                                    ? 'bg-obsidian-700 text-obsidian-400 cursor-wait'
                                    : 'bg-gradient-to-r from-indigo-700 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-500 shadow-lg shadow-violet-500/20'
                            }`}
                        >
                            {rollingTalent ? '🔮 Channeling the Way...' : wildTalent ? '🔄 Re-Roll Wild Talent' : '🔮 Roll Wild Talent'}
                        </button>

                        {wildTalent && (
                            <div className={`bg-obsidian-800 border rounded-sm p-1.5 transition-all duration-300 ${
                                rollingTalent ? 'border-violet-500/50 shadow-lg shadow-violet-500/10' : 'border-obsidian-700'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-display text-sand-200 ${
                                        rollingTalent ? 'animate-pulse' : ''
                                    }`}>
                                        {wildTalent.name}
                                    </span>
                                    <span className="text-xs text-violet-400 font-mono">{wildTalent.cost} PSP</span>
                                </div>
                                <div className="flex gap-2 mt-0.5">
                                    <span className="text-xs text-indigo-400">{wildTalent.discipline}</span>
                                    {wildTalent.range && <span className="text-xs text-obsidian-500">Range: {wildTalent.range}</span>}
                                    {wildTalent.duration && <span className="text-xs text-obsidian-500">Duration: {wildTalent.duration}</span>}
                                </div>
                                {!rollingTalent && wildTalent.description && (
                                    <p className="text-xs text-obsidian-300 mt-1 leading-relaxed line-clamp-3">
                                        {wildTalent.description}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            className="flex-1 py-2.5 bg-gradient-to-r from-sand-600 to-sand-500 hover:from-sand-500 hover:to-sand-400
                                       text-obsidian-950 font-display font-semibold rounded-sm tracking-wide
                                       transition-all duration-200 shadow-lg shadow-sand-500/20 hover:shadow-sand-500/40 text-sm"
                        >
                            ⚔️ Forge Character
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-obsidian-400 hover:text-sand-300 hover:border-obsidian-500 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
