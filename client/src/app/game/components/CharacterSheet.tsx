'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { useSyncField } from '@/hooks/useSyncField';
import { CompendiumSearch } from './CompendiumSearch';
import { StatsTab } from './StatsTab';
import { SkillsTab } from './SkillsTab';
import { PowersTab } from './PowersTab';
import { SpellsTab } from './SpellsTab';
import { EquipmentTab } from './EquipmentTab';
import { SurvivalTab } from './SurvivalTab';
import { NotesTab } from './NotesTab';
import { ConditionsBar } from './ConditionsBar';
import { CharacterCreateDialog } from './CharacterCreateDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import {
    xpForLevel, xpToNextLevel, formatClassLevels,
    multiclassXpForLevel, hasCasterClass,
    getBreakageDC, getWaterRequirement,
    HEAT_SICKNESS_STAGES, FORCED_MARCH_STAGES,
} from 'athas-shared';
import type { ClassEntry, EquipmentItem } from 'athas-shared';
import { api } from '@/lib/api';

type CompendiumCategory = 'psionics' | 'equipment' | 'spells' | 'feats';

interface CharacterSheetProps {
    onFieldChange: (characterId: string, field: string, value: string | number | boolean) => void;
    onUsePower: (characterId: string, powerIndex: number, cost: number) => void;
    onCreateCharacter?: (data: any) => void;
    onDeleteCharacter?: (characterId: string) => void;
    isGM?: boolean;
    characterCount?: number;
    readOnly?: boolean;
}

export function CharacterSheet({ onFieldChange, onUsePower, onCreateCharacter, onDeleteCharacter, isGM = false, characterCount = 0, readOnly = false }: CharacterSheetProps) {
    const char = useCharacter();
    const { syncField, syncFields } = useSyncField(char, onFieldChange);
    const [activePower, setActivePower] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'stats' | 'skills' | 'powers' | 'spells' | 'equipment' | 'survival' | 'notes'>('stats');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [compendiumCategory, setCompendiumCategory] = useState<CompendiumCategory | null>(null);
    const [editingXP, setEditingXP] = useState(false);
    const [xpInputValue, setXpInputValue] = useState('');
    const [classDataMap, setClassDataMap] = useState<Record<string, any>>({});
    const [breakageResult, setBreakageResult] = useState<{ itemName: string; roll: number; dc: number; broke: boolean } | null>(null);

    const canCreateMore = isGM || characterCount < 3;

    // Fetch class data for spell progression / prereq checking
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

    // ── Compendium integration ───────────────────────────────────
    const getExistingIds = useCallback((category: CompendiumCategory): string[] => {
        switch (category) {
            case 'psionics': return (char.powers || []).map((p: any) => p.id).filter(Boolean);
            case 'equipment': return (char.equipment || []).map((e: any) => e.id).filter(Boolean);
            case 'spells': return (char.spells || []).map((s: any) => s.id).filter(Boolean);
            case 'feats': return (char.feats || []).map((f: any) => f.id).filter(Boolean);
        }
    }, [char.powers, char.equipment, char.spells, char.feats]);

    const handleCompendiumAdd = useCallback((category: CompendiumCategory, entry: any) => {
        if (!char.characterId) return;

        if (category === 'psionics') {
            const updated = [...(char.powers || []), {
                id: entry.id,
                name: entry.name,
                discipline: entry.discipline,
                level: entry.level,
                cost: entry.cost,
                description: entry.description,
                augments: entry.augments || '',
                display: entry.display || '',
                range: entry.range || '',
                duration: entry.duration || '',
                savingThrow: entry.savingThrow || '',
                powerResistance: entry.powerResistance || '',
            }];
            syncField('powers', updated);
        }

        if (category === 'equipment') {
            const newItem = {
                id: entry.id,
                name: entry.name,
                type: entry.type,
                damage: entry.damage || '',
                armorBonus: entry.armorBonus || 0,
                broken: false,
                breakageDC: getBreakageDC(entry.material || ''),
                weight: entry.weight || 0,
                notes: entry.breakageNote || '',
                material: entry.material || '',
                grantedPowers: entry.grantedPowers || [],
            };
            const updatedEquip = [...(char.equipment || []), newItem];

            // Auto-add granted psionic powers to the powers list
            if (entry.grantedPowers?.length > 0) {
                const newPowers = entry.grantedPowers.map((gp: any) => ({
                    id: gp.powerId || `item-${entry.id}-${gp.name.toLowerCase().replace(/\s+/g, '-')}`,
                    name: gp.name,
                    discipline: '',
                    level: 0,
                    cost: gp.cost,
                    description: gp.description || '',
                    source: 'item',
                    sourceItemId: entry.id,
                    sourceItemName: entry.name,
                    usesPerDay: gp.usesPerDay,
                }));
                const updatedPowers = [...(char.powers || []), ...newPowers];
                syncFields([
                    ['equipment', updatedEquip],
                    ['powers', updatedPowers],
                ]);
            } else {
                syncField('equipment', updatedEquip);
            }
        }

        if (category === 'spells') {
            const updated = [...(char.spells || []), {
                id: entry.id,
                name: entry.name,
                level: entry.level,
                school: entry.school,
                prepared: false,
                castToday: 0,
                description: entry.description || '',
                range: entry.range || '',
                duration: entry.duration || '',
                components: entry.components || '',
                savingThrow: entry.savingThrow || '',
                spellResistance: entry.spellResistance || '',
            }];
            syncField('spells', updated);
        }

        if (category === 'feats') {
            const updated = [...(char.feats || []), {
                id: entry.id,
                name: entry.name,
                description: `${entry.benefit}${entry.special ? `\n\nSpecial: ${entry.special}` : ''}`,
            }];
            syncField('feats', updated);
        }
    }, [char, syncField, syncFields]);

    const handleChange = useCallback((field: string, value: string | number) => {
        if (readOnly || !char.characterId) return;
        char.updateField(field, value);
        onFieldChange(char.characterId, field, value);
    }, [char, onFieldChange, readOnly]);

    const handleNumericChange = useCallback((field: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) handleChange(field, val);
    }, [handleChange]);

    // ── Breakage Check Handler ────────────────────────────────────
    const handleBreakageCheck = useCallback((item: EquipmentItem, equipIndex: number) => {
        if (readOnly || !char.characterId) return;
        const dc = item.breakageDC ?? getBreakageDC(item.material || '');
        if (dc === null) return; // Metal — can't break

        const roll = Math.floor(Math.random() * 20) + 1;
        const broke = roll <= dc;

        setBreakageResult({ itemName: item.name, roll, dc, broke });

        if (broke) {
            // Auto-mark item as broken
            const updated = [...(char.equipment || [])];
            updated[equipIndex] = { ...updated[equipIndex], broken: true };
            syncField('equipment', updated);
        }

        // Auto-dismiss after 5 seconds
        setTimeout(() => setBreakageResult(null), 5000);
    }, [char, syncField, readOnly]);

    if (!char.characterId) {
        return (
            <>
                <div className="p-4 text-center">
                    <p className="text-obsidian-500 text-sm italic">No character loaded</p>
                    <p className="text-obsidian-600 text-xs mt-1">Create or select a character to view their sheet</p>
                    {onCreateCharacter && (
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            disabled={!canCreateMore}
                            className={`mt-4 px-6 py-2.5 font-display font-semibold rounded-sm tracking-wide
                                       transition-all duration-200 text-sm
                                       ${canCreateMore
                                    ? 'bg-gradient-to-r from-sand-600 to-sand-500 hover:from-sand-500 hover:to-sand-400 text-obsidian-950 shadow-lg shadow-sand-500/20 hover:shadow-sand-500/40'
                                    : 'bg-obsidian-700 text-obsidian-500 cursor-not-allowed'}`}
                            title={!canCreateMore ? 'Maximum 3 characters reached' : undefined}
                        >
                            ⚔️ Create Character
                        </button>
                    )}
                    {!canCreateMore && (
                        <p className="text-obsidian-500 text-xs mt-2">Maximum 3 characters reached</p>
                    )}
                </div>
                {showCreateDialog && onCreateCharacter && (
                    <CharacterCreateDialog
                        onClose={() => setShowCreateDialog(false)}
                        onCreate={(data) => {
                            onCreateCharacter(data);
                            setShowCreateDialog(false);
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <div className="flex flex-col h-full bg-obsidian-900 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-obsidian-700 bg-obsidian-900/80">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <input
                            value={char.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            readOnly={readOnly}
                            className="text-lg font-display font-bold text-sand-200 bg-transparent border-none w-full focus:outline-none"
                            placeholder="Character Name"
                        />
                        <div className="flex gap-2 text-xs text-obsidian-400 mt-0.5">
                            <span>{char.race}</span>
                            <span>•</span>
                            <span>{char.classLevels.length > 0 ? formatClassLevels(char.classLevels) : char.classLevel}</span>
                            <span>•</span>
                            <span>Lvl {char.level}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        {onCreateCharacter && (
                            <button
                                onClick={() => setShowCreateDialog(true)}
                                disabled={!canCreateMore}
                                className={`px-2 py-1 text-xs font-display uppercase tracking-wider rounded-sm transition-all
                                    ${canCreateMore
                                        ? 'bg-sand-500/20 border border-sand-500/30 text-sand-400 hover:bg-sand-500/30 hover:border-sand-500/50'
                                        : 'bg-obsidian-800 border border-obsidian-700 text-obsidian-600 cursor-not-allowed'}`}
                                title={!canCreateMore ? 'Maximum 3 characters reached' : 'Create a new character'}
                            >
                                ⚔️ New
                            </button>
                        )}
                        {onDeleteCharacter && (
                            <button
                                onClick={() => setShowDeleteDialog(true)}
                                className="px-2 py-1 text-xs font-display uppercase tracking-wider rounded-sm
                                    bg-crimson/10 border border-crimson/20 text-crimson-light/70
                                    hover:bg-crimson/20 hover:border-crimson/40 hover:text-crimson-light transition-all"
                                title="Delete this character"
                            >
                                🗑️ Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* HP / PSP bar */}
            <div className="px-3 py-2 border-b border-obsidian-700 grid grid-cols-2 gap-2">
                {/* HP */}
                <div>
                    <label className="text-sm text-obsidian-500 uppercase tracking-wider">Hit Points</label>
                    <div className="flex items-center gap-1 mt-0.5">
                        <input
                            type="number"
                            value={char.hitPointsCurrent}
                            onChange={(e) => handleNumericChange('hitPointsCurrent', e)}
                            readOnly={readOnly}
                            className="w-12 px-1.5 py-0.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                        />
                        <span className="text-obsidian-500 text-xs">/</span>
                        <input
                            type="number"
                            value={char.hitPointsMax}
                            onChange={(e) => handleNumericChange('hitPointsMax', e)}
                            readOnly={readOnly}
                            className="w-12 px-1.5 py-0.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                        />
                    </div>
                    <div className="mt-1 h-1.5 bg-obsidian-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={char.hitPointsCurrent} aria-valuemin={0} aria-valuemax={char.hitPointsMax} aria-label="Hit Points">
                        <div
                            className="h-full bg-gradient-to-r from-crimson to-crimson-light rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, (char.hitPointsCurrent / Math.max(1, char.hitPointsMax)) * 100))}%` }}
                        />
                    </div>
                </div>

                {/* PSP */}
                <div>
                    <label className="text-sm text-obsidian-500 uppercase tracking-wider">Power Points</label>
                    <div className="flex items-center gap-1 mt-0.5">
                        <input
                            type="number"
                            value={char.pspCurrent}
                            onChange={(e) => handleNumericChange('pspCurrent', e)}
                            readOnly={readOnly}
                            className="w-12 px-1.5 py-0.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                        />
                        <span className="text-obsidian-500 text-xs">/</span>
                        <input
                            type="number"
                            value={char.pspMax}
                            onChange={(e) => handleNumericChange('pspMax', e)}
                            readOnly={readOnly}
                            className="w-12 px-1.5 py-0.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 text-center focus:outline-none focus:border-sand-500"
                        />
                    </div>
                    <div className="mt-1 h-1.5 bg-obsidian-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={char.pspCurrent} aria-valuemin={0} aria-valuemax={char.pspMax} aria-label="Psionic Strength Points">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-700 to-violet-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, (char.pspCurrent / Math.max(1, char.pspMax)) * 100))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Water Supply bar */}
            {char.characterId && (() => {
                const waterReq = getWaterRequirement(char.race);
                const waterMax = Math.max(waterReq.active * 3, char.waterSupply || 0, 2);
                const waterPct = waterMax > 0 ? Math.min(100, ((char.waterSupply || 0) / waterMax) * 100) : 0;
                const daysLeft = waterReq.active > 0 ? (char.waterSupply || 0) / waterReq.active : Infinity;
                const barColor = (char.waterSupply || 0) <= 0 ? 'from-red-700 to-red-500'
                    : daysLeft <= 1 ? 'from-orange-700 to-orange-500'
                    : daysLeft <= 2 ? 'from-yellow-700 to-yellow-500'
                    : 'from-sky-700 to-cyan-500';
                return (
                    <div className="px-3 py-1 border-b border-obsidian-700">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">💧 Water</span>
                            <span className={`text-xs font-mono ${
                                (char.waterSupply || 0) <= 0 ? 'text-red-400 animate-pulse' :
                                daysLeft <= 1 ? 'text-orange-400' :
                                daysLeft <= 2 ? 'text-yellow-400' :
                                'text-sky-400'
                            }`}>
                                {(char.waterSupply || 0).toFixed(1)} gal
                                <span className="text-obsidian-500 ml-1">
                                    ({(char.waterSupply || 0) <= 0 ? 'EMPTY' :
                                      daysLeft === Infinity ? '∞' :
                                      `~${daysLeft.toFixed(1)}d`})
                                </span>
                            </span>
                        </div>
                        <div className="h-1 bg-obsidian-800 rounded-full overflow-hidden" role="progressbar"
                             aria-valuenow={char.waterSupply || 0} aria-valuemin={0} aria-valuemax={waterMax} aria-label="Water Supply">
                            <div
                                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-300 ${
                                    (char.waterSupply || 0) <= 0 ? 'animate-pulse' : ''
                                }`}
                                style={{ width: `${waterPct}%` }}
                            />
                        </div>
                    </div>
                );
            })()}

            {/* Heat status indicator (only when heat sickness is active) */}
            {char.characterId && (char.heatSicknessStage || 0) > 0 && (() => {
                const hStage = HEAT_SICKNESS_STAGES[char.heatSicknessStage] || HEAT_SICKNESS_STAGES[0];
                const heatPct = Math.min(100, ((char.heatSicknessStage || 0) / 3) * 100);
                const heatBarColor = char.heatSicknessStage === 1 ? 'from-yellow-700 to-yellow-500'
                    : char.heatSicknessStage === 2 ? 'from-orange-700 to-orange-500'
                    : 'from-red-700 to-red-500';
                return (
                    <div className="px-3 py-1 border-b border-obsidian-700">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">🔥 Heat</span>
                            <span className={`text-xs font-mono ${
                                char.heatSicknessStage === 1 ? 'text-yellow-400' :
                                char.heatSicknessStage === 2 ? 'text-orange-400' :
                                'text-red-400 animate-pulse'
                            }`}>
                                {hStage.icon} {hStage.name}
                                <span className="text-obsidian-500 ml-1">
                                    ({(char.heatExposureHours || 0).toFixed(1)}h)
                                </span>
                            </span>
                        </div>
                        <div className="h-1 bg-obsidian-800 rounded-full overflow-hidden" role="progressbar"
                             aria-valuenow={char.heatSicknessStage} aria-valuemin={0} aria-valuemax={3} aria-label="Heat Sickness">
                            <div
                                className={`h-full bg-gradient-to-r ${heatBarColor} rounded-full transition-all duration-300 ${
                                    char.heatSicknessStage >= 3 ? 'animate-pulse' : ''
                                }`}
                                style={{ width: `${heatPct}%` }}
                            />
                        </div>
                    </div>
                );
            })()}

            {/* March fatigue indicator (only when forced march fatigue is active) */}
            {char.characterId && (char.forcedMarchStage || 0) > 0 && (() => {
                const mStage = FORCED_MARCH_STAGES[char.forcedMarchStage] || FORCED_MARCH_STAGES[0];
                const marchPct = Math.min(100, ((char.forcedMarchStage || 0) / 3) * 100);
                const marchBarColor = char.forcedMarchStage === 1 ? 'from-yellow-700 to-yellow-500'
                    : char.forcedMarchStage === 2 ? 'from-orange-700 to-orange-500'
                    : 'from-red-700 to-red-500';
                return (
                    <div className="px-3 py-1 border-b border-obsidian-700">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">🥾 March</span>
                            <span className={`text-xs font-mono ${
                                char.forcedMarchStage === 1 ? 'text-yellow-400' :
                                char.forcedMarchStage === 2 ? 'text-orange-400' :
                                'text-red-400 animate-pulse'
                            }`}>
                                {mStage.icon} {mStage.name}
                                <span className="text-obsidian-500 ml-1">
                                    ({(char.marchHoursToday || 0).toFixed(1)}h)
                                </span>
                            </span>
                        </div>
                        <div className="h-1 bg-obsidian-800 rounded-full overflow-hidden" role="progressbar"
                             aria-valuenow={char.forcedMarchStage} aria-valuemin={0} aria-valuemax={3} aria-label="March Fatigue">
                            <div
                                className={`h-full bg-gradient-to-r ${marchBarColor} rounded-full transition-all duration-300 ${
                                    char.forcedMarchStage >= 3 ? 'animate-pulse' : ''
                                }`}
                                style={{ width: `${marchPct}%` }}
                            />
                        </div>
                    </div>
                );
            })()}

            {/* Conditions */}
            {char.characterId && <ConditionsBar conditions={char.conditions || []} syncField={syncField} readOnly={readOnly} />}

            {/* XP Progress Bar */}
            {char.characterId && (
                <div className="px-3 py-1 border-b border-obsidian-700">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-obsidian-500 uppercase tracking-wider font-display">Experience</span>
                        {(() => {
                            const nextLevelXP = char.classLevels.length > 0 ? multiclassXpForLevel(char.classLevels, char.level + 1) : xpForLevel(char.classLevel, char.level + 1);
                            const canLevelUp = char.experiencePoints >= nextLevelXP && char.level < 20;
                            return (
                                <>
                                    {editingXP ? (
                                        <input
                                            type="number"
                                            autoFocus
                                            value={xpInputValue}
                                            onChange={(e) => setXpInputValue(e.target.value)}
                                            onBlur={() => {
                                                const val = parseInt(xpInputValue, 10);
                                                if (!isNaN(val)) handleChange('experiencePoints', val);
                                                setEditingXP(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = parseInt(xpInputValue, 10);
                                                    if (!isNaN(val)) handleChange('experiencePoints', val);
                                                    setEditingXP(false);
                                                }
                                                if (e.key === 'Escape') setEditingXP(false);
                                            }}
                                            className="w-24 px-1 py-0 bg-obsidian-800 border border-sand-500 rounded-sm text-xs font-mono text-sand-200 text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (!readOnly) {
                                                    setXpInputValue(String(char.experiencePoints || 0));
                                                    setEditingXP(true);
                                                }
                                            }}
                                            className={`text-xs font-mono ${canLevelUp ? 'text-amber-400 animate-pulse' : 'text-obsidian-400'} ${!readOnly ? 'hover:text-sand-300 cursor-pointer' : ''}`}
                                        >
                                            {canLevelUp && '⬆ '}
                                            {(char.experiencePoints || 0).toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                    {(() => {
                        const primaryClass = char.classLevels.length > 0 ? char.classLevels[0].className : char.classLevel;
                        const nextLvlXP = char.classLevels.length > 0 ? multiclassXpForLevel(char.classLevels, char.level + 1) : xpForLevel(char.classLevel, char.level + 1);
                        const { progress } = xpToNextLevel(primaryClass, char.level, char.experiencePoints || 0);
                        return (
                            <div className="h-1.5 bg-obsidian-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={char.experiencePoints || 0} aria-valuemin={0} aria-valuemax={nextLvlXP} aria-label="Experience Points">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-700 to-yellow-500 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, progress * 100)}%` }}
                                />
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Breakage Check Result Toast */}
            {breakageResult && (
                <div className={`mx-3 mt-1 p-2 rounded-sm border text-xs animate-pulse ${
                    breakageResult.broke
                        ? 'bg-crimson-dark/30 border-crimson/50 text-crimson-light'
                        : 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
                }`}>
                    <span className="font-display uppercase tracking-wider">
                        {breakageResult.broke ? '💔 SHATTERED!' : '✅ Held!'}
                    </span>
                    <span className="ml-2 font-mono">
                        {breakageResult.itemName} — rolled {breakageResult.roll}
                        {breakageResult.broke
                            ? ` (≤ DC ${breakageResult.dc})`
                            : ` (> DC ${breakageResult.dc})`
                        }
                    </span>
                </div>
            )}

            {/* Tab navigation */}
            <div className="flex border-b border-obsidian-700">
                {(() => {
                    const isCaster = char.classLevels.length > 0
                        ? hasCasterClass(char.classLevels)
                        : ['Cleric', 'Defiler', 'Preserver', 'Templar'].some(c => char.classLevel?.toLowerCase().includes(c.toLowerCase()));
                    const baseTabs = isCaster
                        ? ['stats', 'skills', 'powers', 'spells', 'equipment', 'survival', 'notes'] as const
                        : ['stats', 'skills', 'powers', 'equipment', 'survival', 'notes'] as const;
                    const tabLabels: Record<string, string> = {
                        spells: 'spells',
                        survival: 'survival',
                    };
                    return baseTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-1.5 text-xs font-display uppercase tracking-wider transition-colors
              ${activeTab === tab
                                    ? 'text-sand-300 border-b-2 border-sand-500 bg-obsidian-800/50'
                                    : 'text-obsidian-500 hover:text-obsidian-300'
                                }`}
                        >
                            {tabLabels[tab] || tab}
                        </button>
                    ));
                })()}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {activeTab === 'stats' && (
                    <>
                        {!readOnly && (
                            <button
                                onClick={() => setCompendiumCategory('feats')}
                                className="w-full mb-2 py-1.5 text-xs font-display uppercase tracking-wider
                                           bg-amber-900/30 border border-amber-700/40 rounded-sm
                                           text-amber-300 hover:bg-amber-900/50 hover:border-amber-600/60 transition-colors"
                            >
                                🏅 Browse Feat Compendium
                            </button>
                        )}
                        <StatsTab
                            char={char}
                            conditions={char.conditions || []}
                            handleNumericChange={handleNumericChange}
                            handleChange={handleChange}
                            syncField={syncField}
                            syncFields={syncFields}
                            readOnly={readOnly}
                        />
                    </>
                )}
                {activeTab === 'skills' && (
                    <SkillsTab
                        skills={char.skills}
                        char={char}
                        onSkillsChange={(skills: any[]) => syncField('skills', skills)}
                        readOnly={readOnly}
                    />
                )}
                {activeTab === 'powers' && (
                    <>
                        {!readOnly && (
                            <button
                                onClick={() => setCompendiumCategory('psionics')}
                                className="w-full mb-2 py-1.5 text-xs font-display uppercase tracking-wider
                                           bg-indigo-900/30 border border-indigo-700/40 rounded-sm
                                           text-indigo-300 hover:bg-indigo-900/50 hover:border-indigo-600/60 transition-colors"
                            >
                                🔮 Browse Psionic Compendium
                            </button>
                        )}
                        <PowersTab
                            powers={char.powers}
                            pspCurrent={char.pspCurrent}
                            activePower={activePower}
                            setActivePower={setActivePower}
                            onUsePower={(powerIndex: number, cost: number) => {
                                if (char.characterId) onUsePower(char.characterId, powerIndex, cost);
                            }}
                            readOnly={readOnly}
                        />
                    </>
                )}
                {activeTab === 'spells' && (
                    <>
                        {!readOnly && (
                            <button
                                onClick={() => setCompendiumCategory('spells')}
                                className="w-full mb-2 py-1.5 text-xs font-display uppercase tracking-wider
                                           bg-sky-900/30 border border-sky-700/40 rounded-sm
                                           text-sky-300 hover:bg-sky-900/50 hover:border-sky-600/60 transition-colors"
                            >
                                ✨ Browse Spell Compendium
                            </button>
                        )}
                        <SpellsTab
                            spells={char.spells}
                            spellSlots={char.spellSlots}
                            classLevel={char.classLevel}
                            onSpellsChange={(spells: any[]) => syncField('spells', spells)}
                            onSlotsChange={(slots: any[]) => syncField('spellSlots', slots)}
                            readOnly={readOnly}
                        />
                    </>
                )}
                {activeTab === 'equipment' && (
                    <>
                        {!readOnly && (
                            <button
                                onClick={() => setCompendiumCategory('equipment')}
                                className="w-full mb-2 py-1.5 text-xs font-display uppercase tracking-wider
                                           bg-sand-500/10 border border-sand-500/30 rounded-sm
                                           text-sand-400 hover:bg-sand-500/20 hover:border-sand-500/50 transition-colors"
                            >
                                ⚔️ Browse Equipment Compendium
                            </button>
                        )}
                        <EquipmentTab
                            equipment={char.equipment || []}
                            char={char}
                            onEquipmentChange={(equipment: any[]) => syncField('equipment', equipment)}
                            onRemoveItem={(index: number) => {
                                const item = (char.equipment || [])[index];
                                const updatedEquip = (char.equipment || []).filter((_: any, i: number) => i !== index);
                                // Remove item-granted powers
                                if ((item?.grantedPowers?.length ?? 0) > 0) {
                                    const updatedPowers = (char.powers || []).filter(
                                        (p: any) => p.sourceItemId !== item.id
                                    );
                                    syncFields([
                                        ['equipment', updatedEquip],
                                        ['powers', updatedPowers],
                                    ]);
                                } else {
                                    syncField('equipment', updatedEquip);
                                }
                            }}
                            onBreakageCheck={handleBreakageCheck}
                            readOnly={readOnly}
                        />
                    </>
                )}
                {activeTab === 'survival' && (
                    <SurvivalTab
                        race={char.race}
                        waterSupply={char.waterSupply || 0}
                        dehydrationStage={char.dehydrationStage || 0}
                        heatSicknessStage={char.heatSicknessStage || 0}
                        heatExposureHours={char.heatExposureHours || 0}
                        marchHoursToday={char.marchHoursToday || 0}
                        forcedMarchStage={char.forcedMarchStage || 0}
                        speed={char.speed || 30}
                        conMod={Math.floor(((char.constitution || 10) - 10) / 2)}
                        equipment={char.equipment || []}
                        syncField={syncField}
                        onEquipmentChange={(equipment: any[]) => syncField('equipment', equipment)}
                        onBreakageCheck={handleBreakageCheck}
                        level={char.level || 1}
                        readOnly={readOnly}
                    />
                )}
                {activeTab === 'notes' && (
                    <NotesTab
                        notes={char.notes}
                        appearance={char.appearance}
                        personality={char.personality}
                        syncField={syncField}
                        readOnly={readOnly}
                    />
                )}
            </div>

            {/* Compendium Search Overlay */}
            {compendiumCategory && (() => {
                const maxSpellLevelByClass: Record<string, number> = {};
                for (const entry of (char.classLevels || [])) {
                    const cd = classDataMap[entry.className] as any;
                    if (cd?.spellProgression) {
                        const spd = cd.spellProgression.spellsPerDay[entry.level - 1];
                        if (spd) {
                            let maxLvl = 0;
                            for (let i = spd.length - 1; i >= 0; i--) {
                                if (spd[i] != null && spd[i] > 0) { maxLvl = i; break; }
                            }
                            maxSpellLevelByClass[entry.className] = maxLvl;
                        }
                    }
                }
                return (
                    <CompendiumSearch
                        category={compendiumCategory}
                        characterClass={char.classLevels?.length > 0 ? formatClassLevels(char.classLevels) : char.classLevel}
                        characterLevel={char.level}
                        characterData={{
                            strength: char.strength, dexterity: char.dexterity,
                            constitution: char.constitution, intelligence: char.intelligence,
                            wisdom: char.wisdom, charisma: char.charisma,
                            feats: char.feats || [],
                            baseAttackBonus: char.baseAttackBonus,
                            classLevels: char.classLevels || [],
                            level: char.level,
                            skills: char.skills || [],
                            maxSpellLevelByClass,
                        }}
                        existingIds={getExistingIds(compendiumCategory)}
                        onAdd={(entry) => handleCompendiumAdd(compendiumCategory, entry)}
                        onClose={() => setCompendiumCategory(null)}
                    />
                );
            })()}

            {/* Create Character Dialog */}
            {showCreateDialog && onCreateCharacter && (
                <CharacterCreateDialog
                    onClose={() => setShowCreateDialog(false)}
                    onCreate={(data) => {
                        onCreateCharacter(data);
                        setShowCreateDialog(false);
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && char.characterId && onDeleteCharacter && (
                <DeleteConfirmDialog
                    characterName={char.name || 'this character'}
                    onClose={() => setShowDeleteDialog(false)}
                    onConfirm={() => {
                        onDeleteCharacter(char.characterId!);
                        setShowDeleteDialog(false);
                    }}
                />
            )}
        </div>
    );
}
