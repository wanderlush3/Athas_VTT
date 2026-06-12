'use client';

import React, { useState } from 'react';
import { useModal } from '@/hooks/useModal';

interface DeleteConfirmDialogProps {
    characterName: string;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteConfirmDialog({ characterName, onClose, onConfirm }: DeleteConfirmDialogProps) {
    const { modalRef } = useModal(true, onClose);
    const [confirmText, setConfirmText] = useState('');
    const isConfirmed = confirmText === 'Yes delete';

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-dialog-title"
                className="bg-obsidian-900 border border-crimson/30 rounded-sm shadow-2xl shadow-crimson/10 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-obsidian-700 flex justify-between items-center">
                    <h2 id="delete-dialog-title" className="font-display text-lg text-crimson-light tracking-wider">🗑️ Delete Character</h2>
                    <button onClick={onClose} aria-label="Close" className="text-obsidian-400 hover:text-sand-300 text-xl transition-colors">✕</button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="text-sm text-obsidian-300">
                        Are you sure you want to permanently delete <span className="text-sand-300 font-display font-semibold">{characterName}</span>?
                    </div>
                    <div className="bg-crimson/5 border border-crimson/20 rounded-sm p-3">
                        <p className="text-sm text-crimson-light/70 uppercase tracking-wider mb-0.5">
                            This action cannot be undone
                        </p>
                        <p className="text-xs text-obsidian-400">
                            Type <span className="text-sand-300 font-mono font-bold">Yes delete</span> to confirm.
                        </p>
                    </div>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full px-3 py-2 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-sand-200
                                   placeholder-obsidian-500 focus:outline-none focus:border-crimson/50 transition-colors"
                        placeholder="Type: Yes delete"
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={!isConfirmed}
                            className={`flex-1 py-2.5 font-display font-semibold rounded-sm tracking-wide transition-all duration-200 text-sm
                                ${isConfirmed
                                    ? 'bg-gradient-to-r from-crimson to-red-600 text-white hover:from-red-600 hover:to-red-500 shadow-lg shadow-crimson/20 hover:shadow-crimson/40'
                                    : 'bg-obsidian-700 text-obsidian-500 cursor-not-allowed'}`}
                        >
                            Delete Forever
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-sm text-obsidian-400 hover:text-sand-300 hover:border-obsidian-500 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
