'use client';

import React, { useState } from 'react';
import { SPELL_SCHOOLS } from 'athas-shared';

interface SpellsTabProps {
    spells: any[];
    spellSlots: any[];
    classLevel: string;
    onSpellsChange: (spells: any[]) => void;
    onSlotsChange: (slots: any[]) => void;
    readOnly?: boolean;
}

export function SpellsTab({ spells, spellSlots, classLevel, onSpellsChange, onSlotsChange, readOnly }: SpellsTabProps) {
    const [showAddSpell, setShowAddSpell] = useState(false);
    const [newSpell, setNewSpell] = useState({
        name: '', level: 0, school: 'Evocation', prepared: false, castToday: 0, description: '',
    });

    // Determine caster type for theming
    const classLower = (classLevel || '').toLowerCase();
    const isDefiler = classLower.includes('defiler');
    const isPreserver = classLower.includes('preserver');
    const isTemplar = classLower.includes('templar');
    const isCleric = classLower.includes('cleric');

    const casterLabel = isDefiler ? '🔥 Defiler' : isPreserver ? '🌿 Preserver' : isTemplar ? '👑 Templar' : isCleric ? '⛪ Cleric' : '✨ Caster';
    const accentClass = isDefiler ? 'from-red-700 to-orange-600' : isPreserver ? 'from-emerald-700 to-green-500' : isTemplar ? 'from-amber-700 to-yellow-500' : 'from-sky-700 to-blue-500';

    // Spell slot management
    const slots: any[] = spellSlots || [];

    const getSlot = (level: number) => {
        const existing = slots.find((s: any) => s.level === level);
        return existing || { level, total: 0, used: 0 };
    };

    const updateSlot = (level: number, field: string, value: number) => {
        if (readOnly) return;
        const newSlots = [...slots];
        const idx = newSlots.findIndex((s: any) => s.level === level);
        if (idx >= 0) {
            newSlots[idx] = { ...newSlots[idx], [field]: Math.max(0, value) };
        } else {
            newSlots.push({ level, total: field === 'total' ? value : 0, used: field === 'used' ? value : 0 });
        }
        onSlotsChange(newSlots);
    };

    const castSlot = (level: number) => {
        const slot = getSlot(level);
        if (slot.used < slot.total) {
            updateSlot(level, 'used', slot.used + 1);
        }
    };

    const addSpell = () => {
        if (!newSpell.name.trim()) return;
        const updated = [...(spells || []), { ...newSpell }];
        onSpellsChange(updated);
        setNewSpell({ name: '', level: 0, school: 'Evocation', prepared: false, castToday: 0, description: '' });
        setShowAddSpell(false);
    };

    const removeSpell = (index: number) => {
        if (readOnly) return;
        const updated = [...(spells || [])];
        updated.splice(index, 1);
        onSpellsChange(updated);
    };

    const togglePrepared = (index: number) => {
        if (readOnly) return;
        const updated = [...(spells || [])];
        updated[index] = { ...updated[index], prepared: !updated[index].prepared };
        onSpellsChange(updated);
    };

    const incrementCast = (index: number) => {
        if (readOnly) return;
        const updated = [...(spells || [])];
        updated[index] = { ...updated[index], castToday: (updated[index].castToday || 0) + 1 };
        onSpellsChange(updated);
    };

    // Group spells by level
    const spellsByLevel: Record<number, any[]> = {};
    (spells || []).forEach((spell: any, idx: number) => {
        const lvl = spell.level || 0;
        if (!spellsByLevel[lvl]) spellsByLevel[lvl] = [];
        spellsByLevel[lvl].push({ ...spell, _index: idx });
    });

    return (
        <div className="space-y-3">
            {/* Caster type header */}
            <div className={`p-2 rounded-sm bg-gradient-to-r ${accentClass} bg-opacity-20`}>
                <span className="text-xs font-display text-white/90 tracking-wider">{casterLabel} Spellbook</span>
            </div>

            {/* Spell Slots */}
            <div>
                <div className="text-sm text-obsidian-500 uppercase tracking-wider mb-1.5">Spell Slots</div>
                <div className="grid grid-cols-5 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                        const slot = getSlot(level);
                        if (level > 0 && slot.total === 0 && !readOnly) {
                            return (
                                <button
                                    key={level}
                                    onClick={() => updateSlot(level, 'total', 1)}
                                    className="bg-obsidian-800/50 border border-obsidian-700/50 rounded-sm p-1 text-center hover:border-obsidian-600 transition-colors"
                                    title={`Add level ${level} slots`}
                                >
                                    <div className="text-xs text-obsidian-600">{level === 0 ? 'C' : level}</div>
                                    <div className="text-xs text-obsidian-600">+</div>
                                </button>
                            );
                        }
                        if (level > 0 && slot.total === 0) return null;
                        const remaining = Math.max(0, slot.total - slot.used);
                        return (
                            <div key={level} className="bg-obsidian-800 border border-obsidian-700 rounded-sm p-1 text-center">
                                <div className="text-xs text-obsidian-500 uppercase">{level === 0 ? 'Cantrip' : `Lvl ${level}`}</div>
                                {level === 0 ? (
                                    <div className="text-xs text-sand-400 font-mono">∞</div>
                                ) : (
                                    <>
                                        <div className="text-xs font-bold text-sand-200 font-mono">{remaining}/{slot.total}</div>
                                        <div className="flex gap-0.5 mt-0.5">
                                            {!readOnly && (
                                                <>
                                                    <button
                                                        onClick={() => castSlot(level)}
                                                        disabled={remaining <= 0}
                                                        className={`flex-1 text-xs py-0.5 rounded-sm ${remaining > 0 ? 'bg-obsidian-700 text-sand-400 hover:bg-obsidian-600' : 'bg-obsidian-800 text-obsidian-600 cursor-not-allowed'}`}
                                                    >Cast</button>
                                                    <button
                                                        onClick={() => updateSlot(level, 'total', slot.total + 1)}
                                                        className="text-xs px-1 py-0.5 bg-obsidian-700 text-obsidian-400 rounded-sm hover:text-sand-300"
                                                    >+</button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!readOnly && slots.some((s: any) => s.used > 0) && (
                    <button
                        onClick={() => {
                            const reset = slots.map((s: any) => ({ ...s, used: 0 }));
                            onSlotsChange(reset);
                            // Also reset castToday on all spells
                            const resetSpells = (spells || []).map((sp: any) => ({ ...sp, castToday: 0 }));
                            onSpellsChange(resetSpells);
                        }}
                        className="mt-1.5 w-full py-1 text-sm bg-obsidian-800 border border-obsidian-700 rounded-sm text-obsidian-400 hover:text-sand-300 hover:border-obsidian-600 transition-colors"
                    >
                        🌅 Long Rest — Reset All Slots
                    </button>
                )}
            </div>

            {/* Spell List */}
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-obsidian-500 uppercase tracking-wider">Prepared Spells</span>
                    {!readOnly && (
                        <button
                            onClick={() => setShowAddSpell(!showAddSpell)}
                            className="text-sm px-2 py-0.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sand-400 hover:text-sand-300 hover:border-sand-500 transition-colors"
                        >
                            {showAddSpell ? 'Cancel' : '+ Add Spell'}
                        </button>
                    )}
                </div>

                {/* Add spell form */}
                {showAddSpell && (
                    <div className="bg-obsidian-800 border border-obsidian-600 rounded-sm p-2 mb-2 space-y-2">
                        <input
                            type="text"
                            value={newSpell.name}
                            onChange={(e) => setNewSpell({ ...newSpell, name: e.target.value })}
                            placeholder="Spell name"
                            className="w-full px-2 py-1 bg-obsidian-700 border border-obsidian-600 rounded-sm text-xs text-sand-200 placeholder-obsidian-500 focus:outline-none focus:border-sand-500"
                            autoFocus
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-obsidian-500 uppercase">Level</label>
                                <select
                                    value={newSpell.level}
                                    onChange={(e) => setNewSpell({ ...newSpell, level: parseInt(e.target.value) })}
                                    className="w-full px-2 py-1 bg-obsidian-700 border border-obsidian-600 rounded-sm text-xs text-sand-200 focus:outline-none"
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => <option key={l} value={l}>{l === 0 ? 'Cantrip' : `Level ${l}`}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-obsidian-500 uppercase">School</label>
                                <select
                                    value={newSpell.school}
                                    onChange={(e) => setNewSpell({ ...newSpell, school: e.target.value })}
                                    className="w-full px-2 py-1 bg-obsidian-700 border border-obsidian-600 rounded-sm text-xs text-sand-200 focus:outline-none"
                                >
                                    {SPELL_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <textarea
                            value={newSpell.description}
                            onChange={(e) => setNewSpell({ ...newSpell, description: e.target.value })}
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full px-2 py-1 bg-obsidian-700 border border-obsidian-600 rounded-sm text-xs text-sand-200 placeholder-obsidian-500 resize-none focus:outline-none focus:border-sand-500"
                        />
                        <button
                            onClick={addSpell}
                            disabled={!newSpell.name.trim()}
                            className="w-full py-1.5 bg-sand-500 text-obsidian-950 rounded-sm text-xs font-display font-semibold hover:bg-sand-400 disabled:bg-obsidian-700 disabled:text-obsidian-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Add Spell
                        </button>
                    </div>
                )}

                {/* Spells grouped by level */}
                {Object.keys(spellsByLevel).length === 0 && !showAddSpell && (
                    <p className="text-xs text-obsidian-500 italic">No spells in spellbook</p>
                )}
                {Object.entries(spellsByLevel)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, levelSpells]) => (
                        <div key={level} className="mb-2">
                            <div className="text-xs text-obsidian-500 uppercase tracking-wider mb-0.5 border-b border-obsidian-700/50 pb-0.5">
                                {level === '0' ? 'Cantrips' : `Level ${level}`}
                            </div>
                            <div className="space-y-0.5">
                                {levelSpells.map((spell: any) => (
                                    <div key={spell._index} className={`flex items-center gap-1.5 px-1.5 py-1 rounded-sm text-xs group ${spell.prepared ? 'bg-obsidian-800/80' : 'bg-obsidian-800/30 opacity-60'}`}>
                                        {/* Prepared checkbox */}
                                        <button
                                            onClick={() => togglePrepared(spell._index)}
                                            disabled={readOnly}
                                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${spell.prepared
                                                ? 'bg-sand-500 border-sand-400 text-obsidian-950'
                                                : 'border-obsidian-600 hover:border-sand-500'
                                                }`}
                                            title={spell.prepared ? 'Prepared' : 'Not prepared'}
                                        >
                                            {spell.prepared && <span className="text-xs font-bold">✓</span>}
                                        </button>

                                        {/* Spell info */}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sand-300 font-display truncate block">{spell.name}</span>
                                            <span className="text-xs text-obsidian-500">{spell.school}</span>
                                        </div>

                                        {/* Cast count */}
                                        {spell.prepared && Number(level) > 0 && (
                                            <button
                                                onClick={() => incrementCast(spell._index)}
                                                disabled={readOnly}
                                                className="text-xs px-1.5 py-0.5 bg-obsidian-700 border border-obsidian-600 rounded-sm text-obsidian-400 hover:text-sand-300 transition-colors shrink-0"
                                                title="Cast this spell"
                                            >
                                                Cast {spell.castToday > 0 ? `(${spell.castToday})` : ''}
                                            </button>
                                        )}

                                        {/* Remove */}
                                        {!readOnly && (
                                            <button
                                                onClick={() => removeSpell(spell._index)}
                                                className="text-obsidian-600 hover:text-crimson-light text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                title="Remove spell"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
