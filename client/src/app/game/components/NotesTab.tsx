'use client';

import React from 'react';

interface NotesTabProps {
    notes: string;
    appearance: string;
    personality: string;
    syncField: (field: string, value: any) => void;
    readOnly?: boolean;
}

export function NotesTab({ notes, appearance, personality, syncField, readOnly }: NotesTabProps) {
    return (
        <div className="space-y-3">
            {/* Appearance */}
            <div>
                <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Appearance</label>
                <textarea
                    value={appearance || ''}
                    onChange={(e) => syncField('appearance', e.target.value)}
                    readOnly={readOnly}
                    placeholder="Physical description, distinguishing features..."
                    rows={2}
                    className="w-full bg-obsidian-800 border border-obsidian-700 rounded-sm p-2
                         text-xs text-sand-200 placeholder-obsidian-500 resize-none
                         focus:outline-none focus:border-sand-500/50 transition-colors"
                />
            </div>
            {/* Personality */}
            <div>
                <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Personality</label>
                <textarea
                    value={personality || ''}
                    onChange={(e) => syncField('personality', e.target.value)}
                    readOnly={readOnly}
                    placeholder="Traits, ideals, bonds, flaws..."
                    rows={2}
                    className="w-full bg-obsidian-800 border border-obsidian-700 rounded-sm p-2
                         text-xs text-sand-200 placeholder-obsidian-500 resize-none
                         focus:outline-none focus:border-sand-500/50 transition-colors"
                />
            </div>
            {/* Freeform Notes */}
            <div>
                <label className="block text-sm text-obsidian-500 uppercase tracking-wider mb-1">Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => syncField('notes', e.target.value)}
                    readOnly={readOnly}
                    placeholder="Character notes, background, goals..."
                    className="w-full h-full min-h-[200px] bg-obsidian-800 border border-obsidian-700 rounded-sm p-2
                         text-xs text-sand-200 placeholder-obsidian-500 resize-none
                         focus:outline-none focus:border-sand-500/50 transition-colors"
                />
            </div>
        </div>
    );
}
