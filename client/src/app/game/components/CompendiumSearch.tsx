'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useModal } from '@/hooks/useModal';
import { api } from '@/lib/api';
import { checkFeatPrerequisites, checkSpellEligibility, metalUpgradeCost } from 'athas-shared';
import type { CharacterPrereqData, ClassEntry } from 'athas-shared';

// ─── Types ───────────────────────────────────────────────────────

type CompendiumCategory = 'psionics' | 'equipment' | 'spells' | 'feats';

interface CompendiumSearchProps {
    category: CompendiumCategory;
    characterClass?: string;
    characterLevel?: number;
    characterData?: CharacterPrereqData & {
        maxSpellLevelByClass?: Record<string, number>;
    };
    onAdd: (entry: any) => void;
    existingIds?: string[];
    onClose: () => void;
}

interface FilterConfig {
    label: string;
    key: string;
    options: string[];
}

// ─── Filter definitions per category ─────────────────────────────

const PSIONIC_DISCIPLINES = [
    'Clairsentience', 'Metapsionics', 'Psychokinesis',
    'Psychometabolism', 'Psychoportation', 'Telepathy',
];

const PSIONIC_CLASSES = ['Psionicist'];

const EQUIPMENT_TYPES = ['weapon', 'armor', 'shield', 'gear', 'artifact', 'other'];
const EQUIPMENT_MATERIALS = ['obsidian', 'bone', 'wood', 'stone', 'chitin', 'metal', 'hide', 'other'];

const SPELL_SCHOOLS = [
    'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
    'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
];
const SPELL_CLASSES = ['Cleric', 'Druid', 'Defiler', 'Preserver', 'Templar'];

const FEAT_TYPES = ['general', 'psionic', 'regional', 'metamagic', 'item creation'];

function getFiltersForCategory(category: CompendiumCategory): FilterConfig[] {
    switch (category) {
        case 'psionics': return [
            { label: 'Discipline', key: 'discipline', options: PSIONIC_DISCIPLINES },
            // No class filter — on Athas all characters receive a wild psionic talent
        ];
        case 'equipment': return [
            { label: 'Type', key: 'type', options: EQUIPMENT_TYPES },
            { label: 'Material', key: 'material', options: EQUIPMENT_MATERIALS },
        ];
        case 'spells': return [
            { label: 'School', key: 'school', options: SPELL_SCHOOLS },
            { label: 'Class', key: 'class', options: SPELL_CLASSES },
        ];
        case 'feats': return [
            { label: 'Type', key: 'type', options: FEAT_TYPES },
        ];
    }
}

// ─── Category icons & labels ─────────────────────────────────────

const CATEGORY_META: Record<CompendiumCategory, { icon: string; label: string; accent: string }> = {
    psionics: { icon: '🔮', label: 'Psionic Powers', accent: 'from-indigo-700 to-violet-600' },
    equipment: { icon: '⚔️', label: 'Equipment', accent: 'from-sand-600 to-sand-500' },
    spells: { icon: '✨', label: 'Spells', accent: 'from-sky-700 to-blue-500' },
    feats: { icon: '🏅', label: 'Feats', accent: 'from-amber-700 to-yellow-600' },
};

// ─── Main Component ──────────────────────────────────────────────

export function CompendiumSearch({
    category,
    characterClass,
    characterLevel,
    characterData,
    onAdd,
    existingIds = [],
    onClose,
}: CompendiumSearchProps) {
    const { modalRef } = useModal(true, onClose);
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const meta = CATEGORY_META[category];
    const filterConfigs = getFiltersForCategory(category);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Clear debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // Load all results on mount (no query = show all)
    useEffect(() => {
        performSearch('', {}, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const performSearch = useCallback(async (searchQuery: string, activeFilters: Record<string, string>, searchPage: number = 1) => {
        setLoading(true);
        setHasSearched(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set('q', searchQuery);

            // Add active filters
            Object.entries(activeFilters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });

            // Auto-apply character level filter for psionics/spells
            if (characterLevel && (category === 'psionics' || category === 'spells')) {
                params.set('level', String(characterLevel));
            }

            params.set('page', String(searchPage));

            const queryStr = params.toString();
            const url = `/compendium/${category}${queryStr ? `?${queryStr}` : ''}`;
            const data = await api.get<{ results: any[]; total: number; page: number; totalPages: number }>(url);
            setResults(data.results);
            setTotalResults(data.total);
            setTotalPages(data.totalPages);
            setPage(data.page);
        } catch (err) {
            console.error('[CompendiumSearch] Search error:', err);
            setResults([]);
            setTotalResults(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [category, characterLevel]);

    const handleQueryChange = useCallback((value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(value, filters, 1);
        }, 300);
    }, [filters, performSearch]);

    const handleFilterChange = useCallback((key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        performSearch(query, newFilters, 1);
    }, [filters, query, performSearch]);

    const handlePageChange = useCallback((newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        performSearch(query, filters, newPage);
    }, [query, filters, totalPages, performSearch]);

    const isAlreadyAdded = (entry: any) => existingIds.includes(entry.id);

    const handleAdd = (entry: any) => {
        if (isAlreadyAdded(entry)) return;
        onAdd(entry);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="compendium-dialog-title"
                className="bg-obsidian-900 border border-obsidian-600 rounded-sm shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-3 border-b border-obsidian-700 bg-gradient-to-r ${meta.accent} bg-opacity-20`}>
                    <div className="flex justify-between items-center">
                        <h2 id="compendium-dialog-title" className="font-display text-base text-white tracking-wider">
                            {meta.icon} {meta.label} Compendium
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-white/60 hover:text-white text-lg transition-colors"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="p-3 border-b border-obsidian-700 space-y-2">
                    {/* Search input */}
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            placeholder={`Search ${meta.label.toLowerCase()}...`}
                            className="w-full px-3 py-2 pl-8 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200 placeholder-obsidian-500 focus:outline-none focus:border-sand-500 focus:ring-1 focus:ring-sand-500/50 transition-colors"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-obsidian-500 text-sm">🔍</span>
                    </div>

                    {/* Filter bar */}
                    <div className="flex gap-2 flex-wrap">
                        {filterConfigs.map((fc) => (
                            <select
                                key={fc.key}
                                value={filters[fc.key] || ''}
                                onChange={(e) => handleFilterChange(fc.key, e.target.value)}
                                className="px-2 py-1 bg-obsidian-800 border border-obsidian-600 rounded-sm text-xs text-sand-300 focus:outline-none focus:border-sand-500"
                            >
                                <option value="">All {fc.label}s</option>
                                {fc.options.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ))}
                        {characterLevel && (category === 'psionics' || category === 'spells') && (
                            <span className="text-sm text-obsidian-500 self-center ml-auto">
                                Showing ≤ Level {characterLevel}
                            </span>
                        )}
                    </div>
                </div>

                {/* Pagination bar */}
                {hasSearched && (
                    <div className="px-3 py-1.5 border-b border-obsidian-700 flex items-center justify-between bg-obsidian-800/50">
                        <span className="text-sm text-obsidian-500">
                            {totalResults} result{totalResults !== 1 ? 's' : ''}
                            {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
                        </span>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page <= 1}
                                    className="px-2 py-0.5 text-sm rounded-sm border border-obsidian-600 text-obsidian-300 hover:bg-obsidian-700 hover:text-sand-300 disabled:opacity-30 disabled:cursor-default transition-colors"
                                >
                                    ◀ Prev
                                </button>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page >= totalPages}
                                    className="px-2 py-0.5 text-sm rounded-sm border border-obsidian-600 text-obsidian-300 hover:bg-obsidian-700 hover:text-sand-300 disabled:opacity-30 disabled:cursor-default transition-colors"
                                >
                                    Next ▶
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Two-pane layout: Results + Detail */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* Results list */}
                    <div className={`${selectedEntry ? 'w-1/2 border-r border-obsidian-700' : 'w-full'} overflow-y-auto transition-all`}>
                        {loading && (
                            <div className="p-4 text-center">
                                <span className="text-xs text-obsidian-500 animate-pulse">Searching...</span>
                            </div>
                        )}
                        {!loading && results.length === 0 && hasSearched && (
                            <div className="p-4 text-center">
                                <span className="text-xs text-obsidian-500 italic">No results found</span>
                            </div>
                        )}
                        {!loading && results.map((entry) => (
                            <ResultItem
                                key={entry.id}
                                entry={entry}
                                category={category}
                                isSelected={selectedEntry?.id === entry.id}
                                isAdded={isAlreadyAdded(entry)}
                                characterData={characterData}
                                onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                            />
                        ))}
                    </div>

                    {/* Detail panel */}
                    {selectedEntry && (
                        <div className="w-1/2 overflow-y-auto">
                            <DetailPanel
                                entry={selectedEntry}
                                category={category}
                                isAdded={isAlreadyAdded(selectedEntry)}
                                characterData={characterData}
                                onAdd={() => handleAdd(selectedEntry)}
                                onClose={() => setSelectedEntry(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Result Item ─────────────────────────────────────────────────

const ResultItem = React.memo(function ResultItem({
    entry,
    category,
    isSelected,
    isAdded,
    characterData,
    onClick,
}: {
    entry: any;
    category: CompendiumCategory;
    isSelected: boolean;
    isAdded: boolean;
    characterData?: CharacterPrereqData & { maxSpellLevelByClass?: Record<string, number> };
    onClick: () => void;
}) {
    // Compute prereq status for feats
    const prereqStatus = useMemo(() => {
        if (category !== 'feats' || !characterData) return null;
        if (!entry.structuredPrereqs && (entry.prerequisites === 'None' || !entry.prerequisites)) return null;
        if (!entry.structuredPrereqs) return null;
        return checkFeatPrerequisites(entry.structuredPrereqs, characterData);
    }, [category, entry, characterData]);

    // Compute spell eligibility
    const spellStatus = useMemo(() => {
        if (category !== 'spells' || !characterData) return null;
        return checkSpellEligibility(
            { level: entry.level, classes: entry.classes || [] },
            characterData.classLevels || [],
            characterData.maxSpellLevelByClass || {},
        );
    }, [category, entry, characterData]);

    const hasPrereqIssue = prereqStatus && !prereqStatus.met;
    const hasSpellIssue = spellStatus && !spellStatus.eligible;

    const isMetal = category === 'equipment' && entry.material?.toLowerCase() === 'metal';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2 text-xs border-b border-obsidian-800/50 transition-colors ${isSelected
                ? 'bg-obsidian-700 border-l-2 border-l-sand-500'
                : isMetal
                    ? 'hover:bg-obsidian-800/80 border-l-2 border-l-amber-500/60'
                    : 'hover:bg-obsidian-800/80 border-l-2 border-l-transparent'
                } ${isAdded ? 'opacity-50' : ''} ${hasPrereqIssue || hasSpellIssue ? 'opacity-60' : ''}`}
        >
            <div className="flex justify-between items-center gap-2">
                <span className="text-sand-300 font-display truncate">
                    {isAdded && <span className="text-green-500 mr-1">✓</span>}
                    {prereqStatus && (
                        <span className={`mr-1 ${prereqStatus.met ? 'text-green-500' : 'text-red-400'}`}>
                            {prereqStatus.met ? '✅' : '❌'}
                        </span>
                    )}
                    {spellStatus && !spellStatus.eligible && (
                        <span className="text-red-400 mr-1">❌</span>
                    )}
                    {entry.name}
                </span>
                <div className="flex gap-1 shrink-0">
                    {category === 'psionics' && (
                        <>
                            <Badge label={`Lvl ${entry.level}`} />
                            <Badge label={`${entry.cost} PSP`} variant="accent" />
                        </>
                    )}
                    {category === 'equipment' && (
                        <>
                            <Badge label={entry.type} />
                            {entry.material && <Badge label={entry.material} variant={entry.material.toLowerCase() === 'metal' ? 'metal' : 'accent'} />}
                        </>
                    )}
                    {category === 'spells' && (
                        <>
                            <Badge label={`Lvl ${entry.level}`} />
                            <Badge label={entry.school} variant="accent" />
                        </>
                    )}
                    {category === 'feats' && (
                        <Badge label={entry.type} />
                    )}
                </div>
            </div>
            {/* Subtitle */}
            <div className="text-sm text-obsidian-500 mt-0.5 truncate">
                {category === 'psionics' && entry.discipline}
                {category === 'equipment' && (entry.grantedPowers?.length > 0 ? `🔮 ${entry.grantedPowers.length} power${entry.grantedPowers.length > 1 ? 's' : ''}` : entry.damage ? `${entry.damage} ${entry.damageType || ''}` : entry.armorBonus ? `AC +${entry.armorBonus}` : '')}
                {category === 'spells' && entry.classes?.join(', ')}
                {category === 'feats' && entry.prerequisites}
            </div>
        </button>
    );
});

// ─── Badge ───────────────────────────────────────────────────────

const Badge = React.memo(function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'accent' | 'metal' }) {
    return (
        <span className={`px-1.5 py-0.5 rounded-sm text-xs font-mono uppercase tracking-wide ${variant === 'metal'
            ? 'bg-amber-900/30 text-amber-400 border border-amber-500/30'
            : variant === 'accent'
                ? 'bg-sand-500/20 text-sand-400 border border-sand-500/30'
                : 'bg-obsidian-700 text-obsidian-300 border border-obsidian-600'
            }`}>
            {label}
        </span>
    );
});

// ─── Detail Panel ────────────────────────────────────────────────

function DetailPanel({
    entry,
    category,
    isAdded,
    characterData,
    onAdd,
    onClose,
}: {
    entry: any;
    category: CompendiumCategory;
    isAdded: boolean;
    characterData?: CharacterPrereqData & { maxSpellLevelByClass?: Record<string, number> };
    onAdd: () => void;
    onClose: () => void;
}) {
    const meta = CATEGORY_META[category];
    const [gmOverride, setGmOverride] = useState(false);
    const [forgeInMetal, setForgeInMetal] = useState(false);

    // Metal upgrade: can upgrade non-metal weapons/armor/shields
    const canForgeInMetal = category === 'equipment'
        && entry.material?.toLowerCase() !== 'metal'
        && ['weapon', 'armor', 'shield'].includes(entry.type);

    // Feat prerequisite check
    const prereqResult = useMemo(() => {
        if (category !== 'feats' || !characterData) return null;
        if (!entry.structuredPrereqs) return null;
        return checkFeatPrerequisites(entry.structuredPrereqs, characterData);
    }, [category, entry, characterData]);

    // Spell eligibility check
    const spellResult = useMemo(() => {
        if (category !== 'spells' || !characterData) return null;
        return checkSpellEligibility(
            { level: entry.level, classes: entry.classes || [] },
            characterData.classLevels || [],
            characterData.maxSpellLevelByClass || {},
        );
    }, [category, entry, characterData]);

    const hasUnmetPrereqs = !!(prereqResult && !prereqResult.met);
    const hasSpellIssue = !!(spellResult && !spellResult.eligible);
    const isBlocked = (hasUnmetPrereqs || hasSpellIssue) && !gmOverride;

    return (
        <div className="p-3 space-y-3">
            {/* Title */}
            <div className="flex justify-between items-start">
                <h3 className="font-display text-sm text-sand-200 tracking-wide">{entry.name}</h3>
                <button
                    onClick={onClose}
                    className="text-obsidian-500 hover:text-sand-300 text-xs transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Category-specific detail fields */}
            {category === 'psionics' && (
                <div className="space-y-1.5 text-xs">
                    <DetailRow label="Discipline" value={entry.discipline} />
                    <DetailRow label="Level" value={entry.level} />
                    <DetailRow label="Cost" value={`${entry.cost} PSP`} />
                    <DetailRow label="Display" value={entry.display} />
                    <DetailRow label="Time" value={entry.manifestingTime} />
                    <DetailRow label="Range" value={entry.range} />
                    <DetailRow label="Target" value={entry.target} />
                    <DetailRow label="Duration" value={entry.duration} />
                    <DetailRow label="Save" value={entry.savingThrow} />
                    <DetailRow label="PR" value={entry.powerResistance} />
                    <DetailRow label="Classes" value={entry.classes?.join(', ')} />
                </div>
            )}

            {category === 'equipment' && (
                <div className="space-y-1.5 text-xs">
                    <DetailRow label="Type" value={`${entry.type}${entry.subtype ? ` (${entry.subtype})` : ''}`} />
                    <DetailRow label="Material" value={forgeInMetal ? 'metal' : entry.material} />
                    <DetailRow label="Cost" value={forgeInMetal ? metalUpgradeCost(entry.cost) : entry.cost} />
                    <DetailRow label="Weight" value={entry.weight ? `${entry.weight} lb` : undefined} />
                    {entry.damage && <DetailRow label="Damage" value={`${entry.damage} ${entry.damageType || ''}`} />}
                    {entry.critical && <DetailRow label="Critical" value={entry.critical} />}
                    {entry.armorBonus != null && <DetailRow label="AC Bonus" value={`+${entry.armorBonus}`} />}
                    {entry.maxDexBonus != null && <DetailRow label="Max Dex" value={`+${entry.maxDexBonus}`} />}
                    {entry.armorCheckPenalty != null && <DetailRow label="ACP" value={String(entry.armorCheckPenalty)} />}
                    {entry.proficiency && <DetailRow label="Proficiency" value={entry.proficiency} />}
                    {entry.range && <DetailRow label="Range" value={entry.range} />}
                    {forgeInMetal && (
                        <div className="p-1.5 bg-amber-900/20 border border-amber-500/30 rounded-sm">
                            <span className="text-sm text-amber-400">✨ True Metal — </span>
                            <span className="text-sm text-obsidian-300">Unbreakable. Cost ×100 per Dark Sun rules.</span>
                        </div>
                    )}
                    {!forgeInMetal && entry.breakageNote && (
                        <div className="p-1.5 bg-crimson-dark/20 border border-crimson/30 rounded-sm">
                            <span className="text-sm text-crimson-light">⚠ Breakage: </span>
                            <span className="text-sm text-obsidian-300">{entry.breakageNote}</span>
                        </div>
                    )}
                    {entry.properties?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                            {entry.properties.map((p: string) => (
                                <span key={p} className="px-1.5 py-0.5 bg-obsidian-700 text-obsidian-300 rounded-sm text-xs uppercase">{p}</span>
                            ))}
                        </div>
                    )}
                    {entry.grantedPowers?.length > 0 && (
                        <div className="mt-2 p-2 bg-indigo-900/20 border border-indigo-700/30 rounded-sm">
                            <div className="text-sm text-indigo-400 font-display uppercase tracking-wider mb-1">🔮 Granted Psionic Powers</div>
                            <div className="space-y-1">
                                {entry.grantedPowers.map((gp: any, i: number) => (
                                    <div key={i} className="flex justify-between items-start gap-2 text-sm">
                                        <div>
                                            <span className="text-violet-300 font-display">{gp.name}</span>
                                            <span className="text-obsidian-400 ml-1">
                                                {gp.usesPerDay ? `${gp.usesPerDay}/day` : 'at will'}
                                            </span>
                                            {gp.description && (
                                                <p className="text-obsidian-400 mt-0.5">{gp.description}</p>
                                            )}
                                        </div>
                                        <span className="text-indigo-400 font-mono shrink-0">{gp.cost} PSP</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {category === 'spells' && (
                <div className="space-y-1.5 text-xs">
                    <DetailRow label="Level" value={entry.level} />
                    <DetailRow label="School" value={`${entry.school}${entry.subschool ? ` (${entry.subschool})` : ''}`} />
                    <DetailRow label="Classes" value={entry.classes?.join(', ')} />
                    <DetailRow label="Components" value={entry.components} />
                    <DetailRow label="Casting" value={entry.castingTime} />
                    <DetailRow label="Range" value={entry.range} />
                    <DetailRow label="Target" value={entry.target} />
                    <DetailRow label="Duration" value={entry.duration} />
                    <DetailRow label="Save" value={entry.savingThrow} />
                    <DetailRow label="SR" value={entry.spellResistance} />
                    {entry.defilingRadius && (
                        <div className="p-1.5 bg-red-900/20 border border-red-700/30 rounded-sm">
                            <span className="text-sm text-red-400">🔥 Defiling Radius: </span>
                            <span className="text-sm text-obsidian-300">{entry.defilingRadius} ft.</span>
                        </div>
                    )}
                    {/* Spell eligibility warning */}
                    {spellResult && !spellResult.eligible && (
                        <div className="p-2 bg-red-900/20 border border-red-700/30 rounded-sm space-y-1">
                            <div className="text-sm text-red-400 font-display uppercase tracking-wider">❌ Spell Requirements Not Met</div>
                            {spellResult.reasons.map((reason, i) => (
                                <div key={i} className="text-sm text-red-300/80">{reason}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {category === 'feats' && (
                <div className="space-y-1.5 text-xs">
                    <DetailRow label="Type" value={entry.type} />
                    {/* Prerequisite breakdown */}
                    {prereqResult && (prereqResult.details.length > 0 || prereqResult.warnings.length > 0) ? (
                        <div className="space-y-1">
                            <span className="text-obsidian-500 text-xs">Prerequisites:</span>
                            <div className="p-2 bg-obsidian-800/60 border border-obsidian-700 rounded-sm space-y-1">
                                {prereqResult.details.map((d, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-sm">
                                        <span className={d.met ? 'text-green-500' : 'text-red-400'}>
                                            {d.met ? '✅' : '❌'}
                                        </span>
                                        <span className={d.met ? 'text-obsidian-300' : 'text-red-300'}>
                                            {d.label}
                                        </span>
                                    </div>
                                ))}
                                {prereqResult.warnings.map((w, i) => (
                                    <div key={`w-${i}`} className="flex items-center gap-1.5 text-sm">
                                        <span className="text-amber-400">⚠️</span>
                                        <span className="text-amber-300/80 italic">{w}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <DetailRow label="Prerequisites" value={entry.prerequisites} />
                    )}
                    <DetailRow label="Benefit" value={entry.benefit} />
                    {entry.special && <DetailRow label="Special" value={entry.special} />}
                    {entry.classes?.length > 0 && <DetailRow label="Classes" value={entry.classes.join(', ')} />}
                </div>
            )}

            {/* Description */}
            <div className="pt-2 border-t border-obsidian-700">
                <p className="text-xs text-obsidian-300 leading-relaxed">{entry.description}</p>
            </div>

            {/* Augments (psionics) */}
            {category === 'psionics' && entry.augments && (
                <div className="p-1.5 bg-indigo-900/20 border border-indigo-700/30 rounded-sm">
                    <span className="text-sm text-indigo-400 font-display">Augment: </span>
                    <span className="text-sm text-obsidian-300">{entry.augments}</span>
                </div>
            )}

            {/* Dark Sun notes */}
            {entry.darkSunNotes && (
                <div className="p-1.5 bg-sand-500/10 border border-sand-500/20 rounded-sm">
                    <span className="text-sm text-sand-500">☀ Athas: </span>
                    <span className="text-sm text-obsidian-300">{entry.darkSunNotes}</span>
                </div>
            )}

            {/* Forge in Metal toggle */}
            {canForgeInMetal && !isAdded && (
                <button
                    onClick={() => setForgeInMetal(!forgeInMetal)}
                    className={`w-full py-1.5 rounded-sm text-sm font-display tracking-wider transition-all border ${forgeInMetal
                        ? 'bg-amber-900/30 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                        : 'bg-obsidian-800 border-obsidian-600 text-obsidian-400 hover:text-amber-400 hover:border-amber-700/50'
                        }`}
                >
                    {forgeInMetal ? '✨ Forged in Metal — ×100 Cost' : '⚔ Forge in Metal'}
                </button>
            )}

            {/* Add button */}
            <button
                onClick={() => {
                    if (forgeInMetal) {
                        onAdd({
                            ...entry,
                            material: 'metal',
                            cost: metalUpgradeCost(entry.cost),
                            breakageThreshold: null,
                            breakageNote: null,
                        });
                    } else {
                        onAdd(entry);
                    }
                }}
                disabled={isAdded || isBlocked}
                className={`w-full py-2 rounded-sm font-display text-xs tracking-wider transition-all ${isAdded
                    ? 'bg-obsidian-700 text-green-500 cursor-default'
                    : isBlocked
                        ? 'bg-obsidian-700 text-red-400/60 cursor-not-allowed border border-red-900/30'
                        : forgeInMetal
                            ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white hover:shadow-lg hover:shadow-amber-500/20'
                            : `bg-gradient-to-r ${meta.accent} text-white hover:shadow-lg hover:shadow-black/30`
                    }`}
            >
                {isAdded
                    ? '✓ Already on Character Sheet'
                    : isBlocked
                        ? '🚫 Prerequisites Not Met'
                        : forgeInMetal
                            ? '✨ Add Metal Version to Character'
                            : `${meta.icon} Add to Character`}
            </button>

            {/* GM Override toggle */}
            {(hasUnmetPrereqs || hasSpellIssue) && !isAdded && (
                <button
                    onClick={() => setGmOverride(!gmOverride)}
                    className={`w-full py-1.5 rounded-sm text-sm font-display tracking-wider transition-all border ${gmOverride
                        ? 'bg-amber-900/30 border-amber-600/50 text-amber-300'
                        : 'bg-obsidian-800 border-obsidian-600 text-obsidian-400 hover:text-obsidian-300 hover:border-obsidian-500'
                        }`}
                >
                    {gmOverride ? '🔓 GM Override Active — Add Enabled' : '🔒 GM Override — Allow Adding'}
                </button>
            )}
        </div>
    );
}

// ─── Detail Row helper ───────────────────────────────────────────

const DetailRow = React.memo(function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
    if (!value && value !== 0) return null;
    return (
        <div className="flex gap-2">
            <span className="text-obsidian-500 shrink-0 w-16 text-right">{label}:</span>
            <span className="text-obsidian-300">{String(value)}</span>
        </div>
    );
});
