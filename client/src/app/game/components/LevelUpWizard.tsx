'use client';

import React, { useState, useCallback } from 'react';
import { useModal } from '@/hooks/useModal';
import {
    ABILITY_DEFINITIONS,
    DARK_SUN_CLASSES,
    formatClassLevels,
    multiclassBAB,
    multiclassSaves,
    multiclassHP,
    earnsFeatAtLevel,
    earnsAbilityBoostAtLevel,
    classGrantsBonusFeatAtLevel,
    skillPointsForLevel,
    maxSkillRank,
    classFeaturesAtLevel,
    babForProgression,
} from 'athas-shared';
import type { ClassEntry, ClassData, ClassFeature, LevelUpRecord } from 'athas-shared';
import { api } from '@/lib/api';

interface LevelUpWizardProps {
    char: any;
    syncFields: (updates: [string, any][]) => void;
    classDataMap: Record<string, any>;
    setClassDataMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    readOnly?: boolean;
}

export function LevelUpWizard({ char, syncFields, classDataMap, setClassDataMap, readOnly }: LevelUpWizardProps) {
    // ── Add Class / Undo toggles ──
    const [showAddClass, setShowAddClass] = useState(false);
    const [addClassName, setAddClassName] = useState('Fighter');
    const [showUndoConfirm, setShowUndoConfirm] = useState(false);

    // ── Level-Up Wizard state ──
    const [showLevelWizard, setShowLevelWizard] = useState(false);
    const closeLevelWizard = useCallback(() => setShowLevelWizard(false), []);
    const { modalRef } = useModal(showLevelWizard, closeLevelWizard);
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardClass, setWizardClass] = useState('Fighter');
    const [wizardHpRolled, setWizardHpRolled] = useState<number | null>(null);
    const [wizardHpRolling, setWizardHpRolling] = useState(false);
    const [wizardSkillPoints, setWizardSkillPoints] = useState<Record<string, number>>({});
    const [wizardSkillBudget, setWizardSkillBudget] = useState(0);
    const [wizardFeat, setWizardFeat] = useState<any>(null);
    const [wizardAbilityBoost, setWizardAbilityBoost] = useState<string | null>(null);
    const [wizardNewFeatures, setWizardNewFeatures] = useState<ClassFeature[]>([]);

    // Computed modifiers
    const conMod = Math.floor((char.constitution - 10) / 2);
    const dexMod = Math.floor((char.dexterity - 10) / 2);

    // ── Level-Up Wizard Logic ────────────────────────────────────────

    const startLevelUp = async (className: string) => {
        if (readOnly || !char.characterId) return;

        let map = { ...classDataMap };
        if (!map[className]) {
            try {
                const classId = className.toLowerCase().replace(/[- ]/g, '-');
                const data = await api.get<any>(`/compendium/classes/${classId}`);
                map[className] = data;
                setClassDataMap(map);
            } catch {}
        }

        const classData = map[className];
        const entries: ClassEntry[] = char.classLevels || [];
        const existingEntry = entries.find(e => e.className === className);
        const newClassLevel = (existingEntry?.level || 0) + 1;
        const newTotalLevel = entries.reduce((s, e) => s + e.level, 0) + 1;
        const isFirstCharacterLevel = newTotalLevel === 1;

        const intMod = Math.floor((char.intelligence - 10) / 2);
        const sp = classData ? skillPointsForLevel(classData.skillPointsPerLevel || 0, intMod, isFirstCharacterLevel) : 0;

        const features = classData?.classFeatures ? classFeaturesAtLevel(classData as ClassData, newClassLevel) : [];

        setWizardClass(className);
        setWizardStep(1);
        setWizardHpRolled(null);
        setWizardHpRolling(false);
        setWizardSkillPoints({});
        setWizardSkillBudget(sp);
        setWizardFeat(null);
        setWizardAbilityBoost(null);
        setWizardNewFeatures(features);
        setShowLevelWizard(true);
    };

    const wizardRollHp = () => {
        const classData = classDataMap[wizardClass];
        if (!classData) return;
        const hitDie = classData.hitDie || 8;
        const entries: ClassEntry[] = char.classLevels || [];
        const newTotalLevel = entries.reduce((s, e) => s + e.level, 0) + 1;

        if (newTotalLevel === 1) {
            setWizardHpRolled(hitDie + conMod);
        } else {
            setWizardHpRolling(true);
            let ticks = 0;
            const maxTicks = 12;
            const interval = setInterval(() => {
                ticks++;
                const roll = Math.floor(Math.random() * hitDie) + 1;
                setWizardHpRolled(roll + conMod);
                if (ticks >= maxTicks) {
                    clearInterval(interval);
                    setWizardHpRolling(false);
                }
            }, 80);
        }
    };

    const wizardTakeAverage = () => {
        const classData = classDataMap[wizardClass];
        if (!classData) return;
        const hitDie = classData.hitDie || 8;
        const entries: ClassEntry[] = char.classLevels || [];
        const newTotalLevel = entries.reduce((s, e) => s + e.level, 0) + 1;
        if (newTotalLevel === 1) {
            setWizardHpRolled(hitDie + conMod);
        } else {
            setWizardHpRolled(Math.floor(hitDie / 2) + 1 + conMod);
        }
    };

    const ABILITY_KEY_MAP: Record<string, string> = {
        str: 'strength', dex: 'dexterity', con: 'constitution',
        int: 'intelligence', wis: 'wisdom', cha: 'charisma',
    };

    const wizardApply = () => {
        if (!char.characterId) return;

        const existingEntries: ClassEntry[] = char.classLevels || [];
        const existingEntry = existingEntries.find(e => e.className === wizardClass);
        const newClassLevel = (existingEntry?.level || 0) + 1;
        const newTotalLevelPreCalc = existingEntries.reduce((s, e) => s + e.level, 0) + 1;
        const hpDelta = wizardHpRolled || 0;

        const record: LevelUpRecord = {
            timestamp: new Date().toISOString(),
            className: wizardClass,
            newClassLevel,
            newTotalLevel: newTotalLevelPreCalc,
            hpGained: hpDelta,
            skillPointsSpent: { ...wizardSkillPoints },
            featGained: wizardFeat ? { name: wizardFeat.name, description: wizardFeat.description || '' } : null,
            abilityBoost: wizardAbilityBoost,
            classFeatures: wizardNewFeatures.map(f => ({ ...f, className: wizardClass })),
            prevStats: {
                hitPointsMax: char.hitPointsMax,
                hitPointsCurrent: char.hitPointsCurrent,
                baseAttackBonus: char.baseAttackBonus,
                saveFort: char.saveFort,
                saveRef: char.saveRef,
                saveWill: char.saveWill,
                pspMax: char.pspMax,
                pspCurrent: char.pspCurrent,
                spellSlots: JSON.parse(JSON.stringify(char.spellSlots || [])),
            },
        };

        const entries: ClassEntry[] = [...(char.classLevels || [])];
        const existing = entries.find(e => e.className === wizardClass);
        if (existing) {
            existing.level += 1;
        } else {
            entries.push({ className: wizardClass, level: 1 });
        }
        const newTotalLevel = entries.reduce((s, e) => s + e.level, 0);
        const map = classDataMap;

        const computedBAB = multiclassBAB(entries, map);
        const computedSaves = multiclassSaves(entries, map);

        const oldHP = char.hitPointsMax || 0;
        const newHP = wizardHpRolled ? oldHP + wizardHpRolled : multiclassHP(entries, map, conMod);

        // Build the batch of updates
        const updates: [string, any][] = [];

        if (wizardAbilityBoost) {
            const newVal = (char as any)[wizardAbilityBoost] + 1;
            updates.push([wizardAbilityBoost, newVal]);
        }

        if (Object.keys(wizardSkillPoints).length > 0) {
            const updatedSkills = [...(char.skills || [])];
            for (const [skillName, addedRanks] of Object.entries(wizardSkillPoints)) {
                const skill = updatedSkills.find((s: any) => s.name === skillName);
                if (skill && addedRanks > 0) {
                    skill.ranks = (skill.ranks || 0) + addedRanks;
                    const abilityKey = skill.abilityMod?.toLowerCase();
                    const fullKey = abilityKey ? (ABILITY_KEY_MAP[abilityKey] || abilityKey) : '';
                    const abilityScore = fullKey ? (char as any)[fullKey] || 10 : 10;
                    skill.modifier = skill.ranks + Math.floor((abilityScore - 10) / 2);
                }
            }
            updates.push(['skills', updatedSkills]);
        }

        if (wizardFeat) {
            const updatedFeats = [...(char.feats || []), wizardFeat];
            updates.push(['feats', updatedFeats]);
        }

        if (wizardNewFeatures.length > 0) {
            const updatedFeatures = [...(char.classFeatures || []), ...wizardNewFeatures.map(f => ({ ...f, className: wizardClass }))];
            updates.push(['classFeatures', updatedFeatures]);
        }

        updates.push(['classLevels', entries]);
        updates.push(['classLevel', formatClassLevels(entries)]);
        updates.push(['level', newTotalLevel]);
        updates.push(['baseAttackBonus', computedBAB]);

        const wisMod = Math.floor((char.wisdom - 10) / 2);
        updates.push(['saveFort', computedSaves.fort + conMod]);
        updates.push(['saveRef', computedSaves.ref + dexMod]);
        updates.push(['saveWill', computedSaves.will + wisMod]);
        updates.push(['hitPointsMax', newHP]);
        updates.push(['hitPointsCurrent', newHP]);

        // Spell slots for casters
        const classData = map[wizardClass] as any;
        if (classData?.spellProgression) {
            const existingEntryForSpells = entries.find(e => e.className === wizardClass);
            const classLevelForSpells = existingEntryForSpells?.level || 1;
            const spellsPerDay = classData.spellProgression.spellsPerDay[classLevelForSpells - 1];
            if (spellsPerDay) {
                const newSlots = spellsPerDay.map((count: number | null, idx: number) => ({
                    level: idx,
                    total: count ?? 0,
                    used: 0,
                })).filter((s: any) => s.total > 0);
                updates.push(['spellSlots', newSlots]);
            }
        }

        // PSP for psionicists
        if (classData?.psionicProgression) {
            const existingEntryForPsp = entries.find(e => e.className === wizardClass);
            const classLevelForPsp = existingEntryForPsp?.level || 1;
            const basePP = classData.psionicProgression.powerPointsPerDay[classLevelForPsp - 1] || 0;
            const intMod = Math.floor((char.intelligence - 10) / 2);
            const bonusPP = Math.max(0, Math.floor(intMod * classLevelForPsp / 2));
            const totalPP = basePP + bonusPP;
            updates.push(['pspMax', totalPP]);
            updates.push(['pspCurrent', totalPP]);
        }

        // Level-up history
        const updatedHistory = [...(char.levelHistory || []), record];
        updates.push(['levelHistory', updatedHistory]);

        syncFields(updates);

        setShowLevelWizard(false);
        setShowAddClass(false);
    };

    // ── Undo Last Level-Up ──
    const undoLastLevel = () => {
        if (!char.characterId) return;
        const history: LevelUpRecord[] = char.levelHistory || [];
        if (history.length === 0) return;

        const record = history[history.length - 1];
        const updates: [string, any][] = [];

        // Restore derived stats from snapshot
        updates.push(['hitPointsMax', record.prevStats.hitPointsMax]);
        updates.push(['hitPointsCurrent', record.prevStats.hitPointsCurrent]);
        updates.push(['baseAttackBonus', record.prevStats.baseAttackBonus]);
        updates.push(['saveFort', record.prevStats.saveFort]);
        updates.push(['saveRef', record.prevStats.saveRef]);
        updates.push(['saveWill', record.prevStats.saveWill]);
        updates.push(['pspMax', record.prevStats.pspMax]);
        updates.push(['pspCurrent', record.prevStats.pspCurrent]);
        updates.push(['spellSlots', record.prevStats.spellSlots]);

        if (record.abilityBoost) {
            const currentVal = (char as any)[record.abilityBoost] || 10;
            updates.push([record.abilityBoost, currentVal - 1]);
        }

        if (Object.keys(record.skillPointsSpent).length > 0) {
            const updatedSkills = [...(char.skills || [])];
            for (const [skillName, ranksToRemove] of Object.entries(record.skillPointsSpent)) {
                const skill = updatedSkills.find((s: any) => s.name === skillName);
                if (skill && ranksToRemove > 0) {
                    skill.ranks = Math.max(0, (skill.ranks || 0) - ranksToRemove);
                    const abilityKey = skill.abilityMod?.toLowerCase();
                    const fullKey = abilityKey ? (ABILITY_KEY_MAP[abilityKey] || abilityKey) : '';
                    const abilityScore = fullKey ? (char as any)[fullKey] || 10 : 10;
                    skill.modifier = skill.ranks + Math.floor((abilityScore - 10) / 2);
                }
            }
            updates.push(['skills', updatedSkills]);
        }

        if (record.featGained) {
            const updatedFeats = (char.feats || []).filter(
                (f: any) => f.name !== record.featGained!.name
            );
            updates.push(['feats', updatedFeats]);
        }

        if (record.classFeatures.length > 0) {
            const featureNames = new Set(record.classFeatures.map(f => `${f.className}:${f.name}:${f.level}`));
            const updatedFeatures = (char.classFeatures || []).filter(
                (f: any) => !featureNames.has(`${f.className}:${f.name}:${f.level}`)
            );
            updates.push(['classFeatures', updatedFeatures]);
        }

        const entries: ClassEntry[] = [...(char.classLevels || [])];
        const entryIdx = entries.findIndex(e => e.className === record.className);
        if (entryIdx >= 0) {
            if (entries[entryIdx].level <= 1) {
                entries.splice(entryIdx, 1);
            } else {
                entries[entryIdx] = { ...entries[entryIdx], level: entries[entryIdx].level - 1 };
            }
        }
        const newTotalLevel = entries.reduce((s, e) => s + e.level, 0);

        updates.push(['classLevels', entries]);
        updates.push(['classLevel', entries.length > 0 ? formatClassLevels(entries) : '']);
        updates.push(['level', newTotalLevel]);

        const updatedHistory = history.slice(0, -1);
        updates.push(['levelHistory', updatedHistory]);

        syncFields(updates);
        setShowUndoConfirm(false);
    };

    return (
        <>
            {/* ── Add Class Level / Undo Buttons ── */}
            {!readOnly && (
                <div className="flex gap-1">
                    <button
                        onClick={() => setShowAddClass(true)}
                        className="flex-1 py-1 text-xs font-display uppercase tracking-wider rounded-sm transition-all
                            bg-violet-900/20 border border-violet-700/30 text-violet-400
                            hover:bg-violet-900/40 hover:border-violet-600/50"
                    >
                        ⬆ Add Class Level
                    </button>
                    {(char.levelHistory || []).length > 0 && (
                        <button
                            onClick={() => setShowUndoConfirm(true)}
                            className="px-2 py-1 text-xs font-display uppercase tracking-wider rounded-sm transition-all
                                bg-crimson/10 border border-crimson/30 text-crimson-light
                                hover:bg-crimson/20 hover:border-crimson/50"
                            title="Undo last level-up"
                        >
                            ⏪ Undo
                        </button>
                    )}
                </div>
            )}

            {/* ── Undo Level-Up Confirmation ── */}
            {showUndoConfirm && (() => {
                const hist: LevelUpRecord[] = char.levelHistory || [];
                if (hist.length === 0) return null;
                const last = hist[hist.length - 1];
                return (
                    <div className="mt-1 bg-obsidian-800 border border-crimson/40 rounded-sm p-2 space-y-1.5">
                        <div className="text-sm text-crimson-light font-display uppercase tracking-wider">⚠ Undo Level-Up</div>
                        <div className="text-xs text-obsidian-300 space-y-0.5">
                            <div>Revert <span className="text-sand-300 font-semibold">{last.className} {last.newClassLevel}</span> (total level {last.newTotalLevel} → {last.newTotalLevel - 1})</div>
                            <div className="text-obsidian-400 space-y-0.5 mt-1">
                                <div>• HP: −{last.hpGained}</div>
                                {last.featGained && <div>• Feat removed: {last.featGained.name}</div>}
                                {last.abilityBoost && <div>• Ability −1: {last.abilityBoost.charAt(0).toUpperCase() + last.abilityBoost.slice(1, 3).toUpperCase()}</div>}
                                {Object.keys(last.skillPointsSpent).filter(k => last.skillPointsSpent[k] > 0).length > 0 && (
                                    <div>• Skill ranks removed: {Object.entries(last.skillPointsSpent).filter(([, v]) => v > 0).map(([k, v]) => `${k} −${v}`).join(', ')}</div>
                                )}
                                {last.classFeatures.length > 0 && (
                                    <div>• Features removed: {last.classFeatures.map(f => f.name).join(', ')}</div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                            <button
                                onClick={undoLastLevel}
                                className="flex-1 py-1 text-sm font-display uppercase tracking-wider rounded-sm
                                    bg-gradient-to-r from-crimson to-red-700 text-white
                                    hover:from-red-600 hover:to-red-500 transition-all"
                            >
                                ⏪ Confirm Undo
                            </button>
                            <button
                                onClick={() => setShowUndoConfirm(false)}
                                className="px-3 py-1 text-sm text-obsidian-400 bg-obsidian-900 border border-obsidian-700 rounded-sm hover:text-sand-300 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* ── Add Class Level Dialog ── */}
            {showAddClass && (
                <div className="bg-obsidian-800 border border-violet-700/50 rounded-sm p-2 space-y-2">
                    <div className="text-sm text-violet-400 font-display uppercase tracking-wider">Add a Level</div>
                    <select
                        value={addClassName}
                        onChange={(e) => setAddClassName(e.target.value)}
                        className="w-full px-2 py-1 bg-obsidian-900 border border-obsidian-600 rounded-sm text-sm text-sand-200 focus:outline-none focus:border-violet-500"
                    >
                        {DARK_SUN_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <button
                            onClick={() => startLevelUp(addClassName)}
                            className="flex-1 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm
                                bg-gradient-to-r from-violet-700 to-violet-600 text-white
                                hover:from-violet-600 hover:to-violet-500 transition-all"
                        >
                            ⬆ Level Up as {addClassName}
                        </button>
                        <button
                            onClick={() => setShowAddClass(false)}
                            className="px-3 py-1.5 text-sm text-obsidian-400 bg-obsidian-900 border border-obsidian-700 rounded-sm hover:text-sand-300 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* ── Level-Up Wizard Overlay ── */}
            {showLevelWizard && (() => {
                const entries: ClassEntry[] = char.classLevels || [];
                const existingEntry = entries.find(e => e.className === wizardClass);
                const newClassLevel = (existingEntry?.level || 0) + 1;
                const newTotalLevel = entries.reduce((s, e) => s + e.level, 0) + 1;
                const classData = classDataMap[wizardClass] as any;
                const hitDie = classData?.hitDie || 8;
                const getsFeat = earnsFeatAtLevel(newTotalLevel) || (classData ? classGrantsBonusFeatAtLevel(classData as ClassData, newClassLevel) : false);
                const getsAbilityBoost = earnsAbilityBoostAtLevel(newTotalLevel);
                const skillsSpent = Object.values(wizardSkillPoints).reduce((s, v) => s + v, 0);
                const skillsRemaining = wizardSkillBudget - skillsSpent;
                const capForSkill = (skillName: string): number => {
                    const isClass = classData?.classSkills?.includes(skillName) ?? false;
                    return maxSkillRank(newTotalLevel, isClass);
                };

                const steps = [
                    { id: 'hp', label: 'Hit Points' },
                    { id: 'skills', label: 'Skills' },
                    ...(getsFeat ? [{ id: 'feat', label: 'Feat' }] : []),
                    ...(getsAbilityBoost ? [{ id: 'ability', label: 'Ability' }] : []),
                    { id: 'summary', label: 'Summary' },
                ];
                const currentStepData = steps[wizardStep - 1];
                const currentStepId = currentStepData?.id || 'hp';
                const isLastStep = wizardStep >= steps.length;

                return (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowLevelWizard(false); }}>
                        <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="levelup-dialog-title"
                            className="bg-obsidian-900 border border-violet-700/50 rounded-sm w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl shadow-violet-900/30">
                            {/* Wizard Header */}
                            <div className="p-3 border-b border-obsidian-700 flex items-center justify-between">
                                <div>
                                    <div id="levelup-dialog-title" className="text-xs text-violet-400 font-display uppercase tracking-wider">Level Up — {wizardClass}</div>
                                    <div className="text-xs text-obsidian-500 font-mono mt-0.5">
                                        Level {newTotalLevel} • {wizardClass} {newClassLevel}
                                    </div>
                                </div>
                                <button onClick={closeLevelWizard} aria-label="Close"
                                    className="text-obsidian-500 hover:text-sand-300 text-sm transition-colors">✕</button>
                            </div>

                            {/* Step indicators */}
                            <div className="px-3 py-1.5 border-b border-obsidian-700/50 flex gap-1">
                                {steps.map((s, i) => (
                                    <div key={s.id} className={`flex-1 text-center text-xs font-display uppercase tracking-wider py-0.5 rounded-sm transition-colors ${
                                        i + 1 === wizardStep ? 'bg-violet-700/30 text-violet-300 border border-violet-600/50' :
                                        i + 1 < wizardStep ? 'text-sand-500' : 'text-obsidian-600'
                                    }`}>
                                        {i + 1 < wizardStep ? '✓' : ''} {s.label}
                                    </div>
                                ))}
                            </div>

                            {/* Step Content */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {/* Step: Hit Points */}
                                {currentStepId === 'hp' && (
                                    <div className="space-y-2">
                                        <div className="text-sm text-obsidian-500 uppercase tracking-wider font-display">Roll Hit Points</div>
                                        <div className="text-xs text-obsidian-400">
                                            Hit Die: <span className="text-sand-300 font-mono">d{hitDie}</span>
                                            {newTotalLevel === 1 && <span className="text-amber-400 ml-1">(Max at 1st level)</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={wizardRollHp} disabled={wizardHpRolling}
                                                className="flex-1 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm bg-crimson/20 border border-crimson/40 text-crimson-light hover:bg-crimson/30 transition-all disabled:opacity-50">
                                                🎲 {newTotalLevel === 1 ? 'Max HP' : 'Roll'}
                                            </button>
                                            {newTotalLevel > 1 && (
                                                <button onClick={wizardTakeAverage}
                                                    className="flex-1 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm bg-obsidian-800 border border-obsidian-600 text-obsidian-300 hover:text-sand-300 hover:border-obsidian-500 transition-all">
                                                    📊 Average ({Math.floor(hitDie / 2) + 1 + conMod})
                                                </button>
                                            )}
                                        </div>
                                        {wizardHpRolled !== null && (
                                            <div className={`text-center py-2 bg-obsidian-800 border rounded-sm ${wizardHpRolling ? 'border-amber-600/50 animate-pulse' : 'border-sand-700/50'}`}>
                                                <div className="text-xs text-obsidian-500 uppercase tracking-wider">HP Gained</div>
                                                <div className={`text-2xl font-bold font-mono ${wizardHpRolling ? 'text-amber-400' : 'text-sand-200'}`}>
                                                    +{wizardHpRolled}
                                                </div>
                                                <div className="text-xs text-obsidian-500">
                                                    (roll + {conMod >= 0 ? '+' : ''}{conMod} CON)
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Step: Skill Points */}
                                {currentStepId === 'skills' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-obsidian-500 uppercase tracking-wider font-display">Allocate Skill Points</div>
                                            <div className={`text-sm font-mono font-bold ${skillsRemaining > 0 ? 'text-amber-400' : 'text-sand-500'}`}>
                                                {skillsRemaining} / {wizardSkillBudget} remaining
                                            </div>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                                            {(char.skills || []).map((skill: any, i: number) => {
                                                const added = wizardSkillPoints[skill.name] || 0;
                                                const currentRanks = (skill.ranks || 0) + added;
                                                const isClassSkill = classData?.classSkills?.includes(skill.name) ?? false;
                                                const cap = capForSkill(skill.name);
                                                const atCap = currentRanks >= cap;
                                                return (
                                                    <div key={skill.name} className={`flex items-center gap-1 py-0.5 px-1 rounded-sm text-xs ${
                                                        isClassSkill ? 'bg-violet-900/10' : ''
                                                    }`}>
                                                        <span className={`flex-1 truncate ${isClassSkill ? 'text-violet-300' : 'text-obsidian-400'}`}>
                                                            {skill.name}
                                                            {isClassSkill && <span className="text-xs text-violet-500 ml-0.5">C</span>}
                                                        </span>
                                                        <span className="text-xs text-obsidian-500 font-mono w-6 text-right">{currentRanks}/{cap}</span>
                                                        <button
                                                            onClick={() => {
                                                                if (added > 0) {
                                                                    setWizardSkillPoints(prev => {
                                                                        const next = { ...prev };
                                                                        next[skill.name] = added - 1;
                                                                        if (next[skill.name] === 0) delete next[skill.name];
                                                                        return next;
                                                                    });
                                                                }
                                                            }}
                                                            disabled={added <= 0}
                                                            className="w-4 h-4 flex items-center justify-center bg-obsidian-800 border border-obsidian-600 rounded-sm text-obsidian-400 hover:text-sand-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                                        >−</button>
                                                        <span className="text-xs font-mono text-sand-300 w-3 text-center">{added}</span>
                                                        <button
                                                            onClick={() => {
                                                                if (skillsRemaining > 0 && !atCap) {
                                                                    setWizardSkillPoints(prev => ({
                                                                        ...prev,
                                                                        [skill.name]: added + 1,
                                                                    }));
                                                                }
                                                            }}
                                                            disabled={skillsRemaining <= 0 || atCap}
                                                            className="w-4 h-4 flex items-center justify-center bg-obsidian-800 border border-obsidian-600 rounded-sm text-obsidian-400 hover:text-sand-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                                        >+</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Step: Feat */}
                                {currentStepId === 'feat' && (
                                    <div className="space-y-2">
                                        <div className="text-sm text-obsidian-500 uppercase tracking-wider font-display">Choose a Feat</div>
                                        <div className="bg-amber-900/15 border border-amber-700/30 rounded-sm p-2">
                                            <p className="text-sm text-amber-300">
                                                🏅 You earned a feat at level {newTotalLevel}!
                                                {classData && classGrantsBonusFeatAtLevel(classData as ClassData, newClassLevel) && (
                                                    <span className="block text-xs text-amber-400/70 mt-0.5">
                                                        + Bonus {classData.bonusFeatType || 'class'} feat from {wizardClass}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {wizardFeat ? (
                                            <div className="bg-obsidian-800 border border-sand-700/50 rounded-sm p-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-sand-300 font-display font-semibold">{wizardFeat.name}</span>
                                                    <button onClick={() => setWizardFeat(null)}
                                                        className="text-xs text-obsidian-500 hover:text-crimson-light transition-colors">✕ Remove</button>
                                                </div>
                                                {wizardFeat.description && (
                                                    <p className="text-xs text-obsidian-400 mt-0.5">{wizardFeat.description}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-obsidian-500 italic">
                                                Use the Feat Compendium button on the Stats tab to browse and select a feat, or skip this step.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Step: Ability Score Increase */}
                                {currentStepId === 'ability' && (
                                    <div className="space-y-2">
                                        <div className="text-sm text-obsidian-500 uppercase tracking-wider font-display">Ability Score Increase</div>
                                        <p className="text-xs text-amber-300">⬆ You gain +1 to one ability score at level {newTotalLevel}!</p>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {ABILITY_DEFINITIONS.map(ab => {
                                                const current = (char as any)[ab.key] || 10;
                                                const selected = wizardAbilityBoost === ab.key;
                                                return (
                                                    <button key={ab.key}
                                                        onClick={() => setWizardAbilityBoost(selected ? null : ab.key)}
                                                        className={`p-1.5 rounded-sm border text-center transition-all ${
                                                            selected
                                                                ? 'bg-amber-900/30 border-amber-600/60 text-amber-300'
                                                                : 'bg-obsidian-800 border-obsidian-700 text-obsidian-400 hover:border-obsidian-500 hover:text-sand-300'
                                                        }`}>
                                                        <div className="text-xs uppercase tracking-wider font-display">{ab.label}</div>
                                                        <div className="text-sm font-bold font-mono">{current}{selected ? '→' + (current + 1) : ''}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Step: Summary */}
                                {currentStepId === 'summary' && (
                                    <div className="space-y-2">
                                        <div className="text-sm text-obsidian-500 uppercase tracking-wider font-display">Level-Up Summary</div>
                                        <div className="space-y-1">
                                            <div className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5 flex items-center justify-between">
                                                <span className="text-xs text-obsidian-400">Class</span>
                                                <span className="text-sm text-sand-300 font-display">{wizardClass} {newClassLevel}</span>
                                            </div>
                                            <div className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5 flex items-center justify-between">
                                                <span className="text-xs text-obsidian-400">Total Level</span>
                                                <span className="text-sm text-sand-300 font-mono">{newTotalLevel}</span>
                                            </div>
                                            <div className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5 flex items-center justify-between">
                                                <span className="text-xs text-obsidian-400">HP Gained</span>
                                                <span className={`text-sm font-mono ${wizardHpRolled ? 'text-sand-300' : 'text-obsidian-500 italic'}`}>
                                                    {wizardHpRolled ? `+${wizardHpRolled}` : 'Not rolled'}
                                                </span>
                                            </div>
                                            {Object.keys(wizardSkillPoints).length > 0 && (
                                                <div className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5">
                                                    <span className="text-xs text-obsidian-400">Skills:</span>
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {Object.entries(wizardSkillPoints).filter(([, v]) => v > 0).map(([name, v]) => (
                                                            <span key={name} className="text-xs bg-violet-900/20 border border-violet-700/30 text-violet-300 px-1 py-0.5 rounded-sm">
                                                                {name} +{v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {wizardFeat && (
                                                <div className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5 flex items-center justify-between">
                                                    <span className="text-xs text-obsidian-400">Feat</span>
                                                    <span className="text-sm text-amber-300 font-display">{wizardFeat.name}</span>
                                                </div>
                                            )}
                                            {wizardAbilityBoost && (
                                                <div className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5 flex items-center justify-between">
                                                    <span className="text-xs text-obsidian-400">Ability Boost</span>
                                                    <span className="text-sm text-amber-300 font-display uppercase">{wizardAbilityBoost.slice(0, 3)} +1</span>
                                                </div>
                                            )}
                                            {wizardNewFeatures.length > 0 && (
                                                <div className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1.5">
                                                    <span className="text-xs text-obsidian-400">New Class Features:</span>
                                                    <div className="space-y-0.5 mt-0.5">
                                                        {wizardNewFeatures.map((f, i) => (
                                                            <div key={i} className="text-xs text-sand-300">
                                                                ✨ <span className="font-display">{f.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Navigation */}
                            <div className="p-3 border-t border-obsidian-700 flex gap-2">
                                {wizardStep > 1 && (
                                    <button onClick={() => setWizardStep(wizardStep - 1)}
                                        className="px-3 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm bg-obsidian-800 border border-obsidian-600 text-obsidian-300 hover:text-sand-300 transition-colors">
                                        ← Back
                                    </button>
                                )}
                                <div className="flex-1" />
                                {isLastStep ? (
                                    <button onClick={wizardApply}
                                        className="flex-1 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm
                                            bg-gradient-to-r from-violet-700 to-violet-600 text-white font-semibold
                                            hover:from-violet-600 hover:to-violet-500 shadow-md shadow-violet-500/20 transition-all">
                                        ✨ Apply Level Up
                                    </button>
                                ) : (
                                    <>
                                        {(currentStepId === 'feat' || currentStepId === 'ability' || currentStepId === 'skills') && (
                                            <button onClick={() => setWizardStep(wizardStep + 1)}
                                                className="px-3 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm bg-obsidian-800 border border-obsidian-600 text-obsidian-400 hover:text-sand-300 transition-colors">
                                                Skip →
                                            </button>
                                        )}
                                        <button onClick={() => setWizardStep(wizardStep + 1)}
                                            className="px-4 py-1.5 text-sm font-display uppercase tracking-wider rounded-sm bg-violet-700/30 border border-violet-600/50 text-violet-300 hover:bg-violet-700/50 transition-all">
                                            Next →
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
