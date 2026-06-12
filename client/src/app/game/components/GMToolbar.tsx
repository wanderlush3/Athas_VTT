'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useModal } from '@/hooks/useModal';
import { api, getAssetUrl } from '@/lib/api';

interface GMToolbarProps {
    activeTool: string;
    brushSize: number;
    onToolChange: (tool: string) => void;
    onBrushSizeChange: (size: number) => void;
    onMapUpload: (file: File) => void;
    onTokenUpload: (file: File, label: string) => void;
    onFogReset: () => void;
    onDefileReset: () => void;
    onSetMap?: (url: string) => void;
}

interface UploadedImage {
    filename: string;
    url: string;
}

export function GMToolbar({
    activeTool,
    brushSize,
    onToolChange,
    onBrushSizeChange,
    onMapUpload,
    onTokenUpload,
    onFogReset,
    onDefileReset,
    onSetMap,
}: GMToolbarProps) {
    const mapInputRef = useRef<HTMLInputElement>(null);
    const tokenInputRef = useRef<HTMLInputElement>(null);
    const [tokenLabel, setTokenLabel] = useState('');
    const [showTokenDialog, setShowTokenDialog] = useState(false);
    const [showMapGallery, setShowMapGallery] = useState(false);
    const [uploadedMaps, setUploadedMaps] = useState<UploadedImage[]>([]);
    const [loadingMaps, setLoadingMaps] = useState(false);

    const closeTokenDialog = useCallback(() => setShowTokenDialog(false), []);
    const closeMapGallery = useCallback(() => setShowMapGallery(false), []);
    const { modalRef: tokenModalRef } = useModal(showTokenDialog, closeTokenDialog);
    const { modalRef: mapGalleryModalRef } = useModal(showMapGallery, closeMapGallery);

    // Keyboard shortcuts for tool switching
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable')) return;

            switch (e.key.toLowerCase()) {
                case 'v': onToolChange('select'); break;
                case 'f': onToolChange('fog_brush'); break;
                case 'd': onToolChange('defile'); break;
                case 't': setShowTokenDialog(true); break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onToolChange]);

    const tools = [
        { id: 'select', icon: '↖', label: 'Select', shortcut: 'V' },
        { id: 'fog_brush', icon: '🌫️', label: 'Fog Brush', shortcut: 'F' },
        { id: 'defile', icon: '🔥', label: 'Defile', shortcut: 'D' },
        { id: 'token_place', icon: '♟️', label: 'Add Token', shortcut: 'T' },
    ];

    // Fetch uploaded maps when gallery opens
    useEffect(() => {
        if (!showMapGallery) return;
        setLoadingMaps(true);

        api.get<UploadedImage[]>('/uploads')
            .then((data) => setUploadedMaps(data))
            .catch((err) => console.error('Failed to load maps:', err))
            .finally(() => setLoadingMaps(false));
    }, [showMapGallery]);

    return (
        <aside className="w-12 bg-obsidian-900 border-r border-obsidian-700 flex flex-col items-center py-2 gap-1">
            {/* Tool buttons */}
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => {
                        if (tool.id === 'token_place') {
                            setShowTokenDialog(true);
                        } else {
                            onToolChange(tool.id);
                        }
                    }}
                    className={`w-9 h-9 rounded-sm flex items-center justify-center text-sm transition-all duration-150
            ${activeTool === tool.id
                            ? 'bg-sand-500/20 border border-sand-500 text-sand-300 shadow-sm shadow-sand-500/20'
                            : 'bg-obsidian-800 border border-transparent text-obsidian-400 hover:text-sand-300 hover:bg-obsidian-700'
                        }`}
                    title={`${tool.label} (${tool.shortcut})`}
                    aria-label={`${tool.label} (${tool.shortcut})`}
                    aria-pressed={activeTool === tool.id}
                >
                    {tool.icon}
                </button>
            ))}

            {/* Divider */}
            <div className="w-6 border-t border-obsidian-700 my-1" />

            {/* Map upload */}
            <button
                onClick={() => mapInputRef.current?.click()}
                className="w-9 h-9 bg-obsidian-800 rounded-sm flex items-center justify-center text-sm text-obsidian-400 hover:text-sand-300 hover:bg-obsidian-700 transition-colors"
                title="Upload Map"
                aria-label="Upload Map"
            >
                🗺️
            </button>
            <input
                ref={mapInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onMapUpload(file);
                    e.target.value = '';
                }}
            />

            {/* Map gallery */}
            <button
                onClick={() => setShowMapGallery(true)}
                className="w-9 h-9 bg-obsidian-800 rounded-sm flex items-center justify-center text-sm text-obsidian-400 hover:text-sand-300 hover:bg-obsidian-700 transition-colors"
                title="Map Gallery — Select from uploaded maps"
                aria-label="Map Gallery"
            >
                📋
            </button>

            {/* Fog reset */}
            <button
                onClick={onFogReset}
                className="w-9 h-9 bg-obsidian-800 rounded-sm flex items-center justify-center text-sm text-obsidian-400 hover:text-crimson-light hover:bg-obsidian-700 transition-colors"
                title="Reset Fog"
                aria-label="Reset Fog"
            >
                ☁️
            </button>

            {/* Defile reset */}
            <button
                onClick={onDefileReset}
                className="w-9 h-9 bg-obsidian-800 rounded-sm flex items-center justify-center text-sm text-obsidian-400 hover:text-crimson-light hover:bg-obsidian-700 transition-colors"
                title="Clear Defilement"
                aria-label="Clear Defilement"
            >
                ☠️
            </button>

            {/* Brush size (when fog tool active) */}
            {activeTool === 'fog_brush' && (
                <div className="mt-auto mb-2 flex flex-col items-center gap-1">
                    <span className="text-xs text-obsidian-500">{brushSize}</span>
                    <input
                        type="range"
                        min="10"
                        max="200"
                        value={brushSize}
                        onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                        className="w-9 appearance-none bg-obsidian-700 h-1 rounded-full
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:bg-sand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                        style={{ writingMode: 'vertical-lr' as any, height: '80px' }}
                        aria-label="Brush size"
                    />
                </div>
            )}

            {/* Token upload dialog */}
            {showTokenDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeTokenDialog}>
                    <div ref={tokenModalRef} role="dialog" aria-modal="true" aria-labelledby="token-dialog-title" className="card w-72 p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 id="token-dialog-title" className="font-display text-sm text-sand-300">Add Token</h3>
                            <button onClick={closeTokenDialog} className="text-sand-400 hover:text-sand-200" aria-label="Close">✕</button>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <label className="label">Label</label>
                                <input
                                    type="text"
                                    value={tokenLabel}
                                    onChange={(e) => setTokenLabel(e.target.value)}
                                    className="input-field text-sm"
                                    placeholder="Goblin 1"
                                />
                            </div>
                            <button
                                onClick={() => tokenInputRef.current?.click()}
                                className="btn-primary w-full text-sm"
                            >
                                Choose Image
                            </button>
                            <input
                                ref={tokenInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        onTokenUpload(file, tokenLabel || 'Token');
                                        setShowTokenDialog(false);
                                        setTokenLabel('');
                                    }
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Map Gallery dialog */}
            {showMapGallery && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeMapGallery}>
                    <div
                        ref={mapGalleryModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="map-gallery-dialog-title"
                        className="bg-obsidian-900 border border-obsidian-600 rounded-sm shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-obsidian-700 flex justify-between items-center">
                            <h2 id="map-gallery-dialog-title" className="font-display text-lg text-sand-300 tracking-wider">🗺️ Map Gallery</h2>
                            <button onClick={closeMapGallery} className="text-obsidian-400 hover:text-sand-300 text-xl transition-colors" aria-label="Close">✕</button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingMaps ? (
                                <p className="text-xs text-obsidian-500 animate-pulse text-center py-8">Loading maps...</p>
                            ) : uploadedMaps.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-obsidian-500 italic">No maps uploaded yet</p>
                                    <p className="text-xs text-obsidian-600 mt-1">Upload a map using the 🗺️ button first</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {uploadedMaps.map((img) => (
                                        <button
                                            key={img.filename}
                                            onClick={() => {
                                                const fullUrl = getAssetUrl(img.url);
                                                onSetMap?.(fullUrl);
                                                setShowMapGallery(false);
                                            }}
                                            className="group relative aspect-video bg-obsidian-800 border border-obsidian-700 rounded-sm overflow-hidden
                                                       hover:border-sand-500 hover:shadow-lg hover:shadow-sand-500/10 transition-all duration-200"
                                        >
                                            <img
                                                src={getAssetUrl(img.url)}
                                                alt={img.filename}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                                                <span className="text-xs text-sand-300 truncate block">{img.filename}</span>
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-sand-500 text-obsidian-950 px-3 py-1 rounded-sm text-xs font-display font-semibold shadow-lg">
                                                    Set as Map
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
