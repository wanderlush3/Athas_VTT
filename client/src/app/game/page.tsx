'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSocket } from '@/hooks/useSocket';
import { useGameState } from '@/hooks/useGameState';
import { useCharacter } from '@/hooks/useCharacter';
import { api } from '@/lib/api';
import { DiceTray } from './components/DiceTray';
import { ChatLog } from './components/ChatLog';
import { CharacterSheet } from './components/CharacterSheet';
import { GMToolbar } from './components/GMToolbar';
import { PlayerSheetViewer } from './components/PlayerSheetViewer';
import { GMSurvivalDashboard } from './components/GMSurvivalDashboard';
import {
    SocketEvents,
    type CampaignStatePayload,
    type TokenMovedPayload,
    type Token,
    type RemoveTokenPayload,
    type DefilePlacedPayload,
    type RemoveDefilePayload,
    type UserJoinedPayload,
    type UserLeftPayload,
    type ChatMessageBroadcast,
    type DiceRollResult,
    type SheetUpdatedPayload,
    type PowerUsedPayload,
    type DieRoll,
    type SessionData,
} from 'athas-shared';

// Dynamically import MapCanvas to avoid SSR issues with Konva
const MapCanvas = dynamic(
    () => import('./components/MapCanvas').then((mod) => ({ default: mod.MapCanvas })),
    { ssr: false, loading: () => <div className="flex-1 bg-obsidian-950" /> }
);

interface ChatEntry {
    id: string;
    type: 'CHAT' | 'ROLL' | 'SYSTEM';
    userId: string;
    username: string;
    content: string;
    timestamp: string;
    rollData?: DiceRollResult;
}

export default function GamePage() {
    const router = useRouter();
    const { emit, on, isConnected } = useSocket();
    const gameState = useGameState();
    const charState = useCharacter();

    const [session, setSession] = useState<SessionData | null>(null);
    const [activeTool, setActiveTool] = useState('select');
    const [brushSize, setBrushSize] = useState(50);
    const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
    const [rightPanel, setRightPanel] = useState<'chat' | 'sheet' | 'survival'>('chat');
    const [characterCount, setCharacterCount] = useState(0);

    const isGM = session?.role === 'GM';

    // ── Load session from localStorage ─────────────────────────────
    useEffect(() => {
        try {
            const stored = localStorage.getItem('athas_session');
            if (stored) {
                setSession(JSON.parse(stored));
            } else {
                router.replace('/');
            }
        } catch {
            router.replace('/');
        }
    }, [router]);

    // ── Fetch character count for current user ─────────────────────
    const refreshCharacterCount = useCallback(async () => {
        if (!session) return;
        try {
            const allChars = await api.get<Array<{ userId: string; id: string }>>('/characters');
            const myChars = allChars.filter((c) => c.userId === session.userId);
            setCharacterCount(myChars.length);
        } catch (err) {
            console.error('Failed to fetch character count:', err);
        }
    }, [session]);

    useEffect(() => {
        refreshCharacterCount();
    }, [refreshCharacterCount]);

    // ── Register socket listeners ──────────────────────────────────
    useEffect(() => {
        if (!on) return;

        const unsubs: Array<() => void> = [];

        // Campaign state (full dump on join)
        unsubs.push(on(SocketEvents.SERVER_CAMPAIGN_STATE, (data: CampaignStatePayload) => {
            gameState.setMapImage(data.mapImageUrl);
            gameState.setFogMask(data.fogMask || '[]');
            gameState.setDefileZones(data.defileZones || []);
            gameState.setTokens(data.tokens || []);
            gameState.setConnectedUsers(data.users || []);
        }));

        // Token events
        unsubs.push(on(SocketEvents.SERVER_TOKEN_MOVED, (data: TokenMovedPayload) => {
            gameState.moveToken(data.tokenId, data.x, data.y);
        }));
        unsubs.push(on(SocketEvents.SERVER_TOKEN_ADDED, (data: Token) => {
            gameState.addToken(data);
        }));
        unsubs.push(on(SocketEvents.SERVER_TOKEN_REMOVED, (data: RemoveTokenPayload) => {
            gameState.removeToken(data.tokenId);
        }));

        // Fog
        unsubs.push(on(SocketEvents.SERVER_FOG_UPDATED, (data: { fogMask: string }) => {
            gameState.setFogMask(data.fogMask);
        }));
        unsubs.push(on(SocketEvents.SERVER_FOG_RESET, () => {
            gameState.setFogMask('[]');
        }));

        // Defiling
        unsubs.push(on(SocketEvents.SERVER_DEFILE_PLACED, (data: DefilePlacedPayload) => {
            gameState.addDefileZone(data);
        }));
        unsubs.push(on(SocketEvents.SERVER_DEFILE_REMOVED, (data: RemoveDefilePayload) => {
            gameState.removeDefileZone(data.id);
        }));
        unsubs.push(on(SocketEvents.SERVER_DEFILE_RESET, () => {
            gameState.setDefileZones([]);
        }));

        // User connect/disconnect
        unsubs.push(on(SocketEvents.SERVER_USER_JOINED, (data: UserJoinedPayload) => {
            gameState.addUser({ id: data.userId, username: data.username, role: data.role });
            setChatMessages((prev) => [...prev, {
                id: `sys-${Date.now()}`,
                type: 'SYSTEM',
                userId: 'system',
                username: 'System',
                content: `${data.username} has entered the wastes.`,
                timestamp: new Date().toISOString(),
            }]);
        }));
        unsubs.push(on(SocketEvents.SERVER_USER_LEFT, (data: UserLeftPayload) => {
            gameState.removeUser(data.userId);
            setChatMessages((prev) => [...prev, {
                id: `sys-${Date.now()}`,
                type: 'SYSTEM',
                userId: 'system',
                username: 'System',
                content: `${data.username} has left the wastes.`,
                timestamp: new Date().toISOString(),
            }]);
        }));

        // Chat & dice
        unsubs.push(on(SocketEvents.SERVER_CHAT_MESSAGE, (data: ChatMessageBroadcast) => {
            setChatMessages((prev) => [...prev, { ...data, type: 'CHAT' }]);
        }));
        unsubs.push(on(SocketEvents.SERVER_DICE_RESULT, (data: DiceRollResult) => {
            setChatMessages((prev) => [...prev, {
                id: `roll-${Date.now()}`,
                type: 'ROLL',
                userId: data.userId,
                username: data.username,
                content: data.formula,
                timestamp: new Date().toISOString(),
                rollData: {
                    dice: data.dice,
                    results: data.results,
                    total: data.total,
                    formula: data.formula,
                    userId: data.userId,
                    username: data.username,
                },
            }]);
        }));

        // Sheet sync — read characterId from store to avoid stale closure
        unsubs.push(on(SocketEvents.SERVER_SHEET_UPDATED, (data: SheetUpdatedPayload) => {
            const currentCharId = useCharacter.getState().characterId;
            if (data.characterId === currentCharId) {
                charState.updateField(data.field, data.value);
            }
        }));
        unsubs.push(on(SocketEvents.SERVER_POWER_USED, (data: PowerUsedPayload) => {
            const currentCharId = useCharacter.getState().characterId;
            if (data.characterId === currentCharId) {
                charState.updateField('pspCurrent', data.newPsp);
            }
        }));

        return () => unsubs.forEach((fn) => fn?.());
    }, [on]);

    // ── Event handlers ─────────────────────────────────────────────
    const handleTokenMoved = useCallback((tokenId: string, x: number, y: number) => {
        gameState.moveToken(tokenId, x, y);
        emit?.(SocketEvents.CLIENT_MOVE_TOKEN, { tokenId, x, y });
    }, [emit, gameState]);

    const handleFogReveal = useCallback((points: Array<{ x: number; y: number }>, size: number) => {
        // Update local state immediately
        gameState.setFogMask((prev: string) => {
            try {
                const existing = JSON.parse(prev || '[]');
                existing.push({ points, brushSize: size });
                return JSON.stringify(existing);
            } catch {
                return prev;
            }
        });
        emit?.(SocketEvents.CLIENT_FOG_REVEAL, { points, brushSize: size });
    }, [emit, gameState]);

    const handleDefilePlaced = useCallback((x: number, y: number, radius: number) => {
        emit?.(SocketEvents.CLIENT_DEFILE, { x, y, radius });
    }, [emit]);

    const handleFogReset = useCallback(() => {
        emit?.(SocketEvents.CLIENT_FOG_RESET, {});
    }, [emit]);

    const handleDefileReset = useCallback(() => {
        emit?.(SocketEvents.CLIENT_DEFILE_RESET, {});
    }, [emit]);

    const handleDiceRoll = useCallback((dice: Array<{ type: string; count: number }>, modifier: number, label: string) => {
        emit?.(SocketEvents.CLIENT_ROLL_DICE, { dice, modifier, label });
    }, [emit]);

    const handleChatMessage = useCallback((content: string) => {
        emit?.(SocketEvents.CLIENT_CHAT_MESSAGE, { content });
    }, [emit]);

    const handleSheetFieldChange = useCallback((characterId: string, field: string, value: string | number | boolean) => {
        emit?.(SocketEvents.CLIENT_UPDATE_SHEET, { characterId, field, value });
    }, [emit]);

    const handleUsePower = useCallback((characterId: string, powerIndex: number, cost: number) => {
        charState.deductPsp(cost);
        emit?.(SocketEvents.CLIENT_USE_POWER, { characterId, powerIndex, cost });
    }, [emit, charState]);

    const handleSelectCharacter = useCallback(async (characterId: string) => {
        /** Safely parse JSON, returning fallback on failure */
        const safeJsonParse = <T,>(value: unknown, fallback: T): T => {
            if (typeof value !== 'string') return (value as T) ?? fallback;
            try { return JSON.parse(value); } catch { return fallback; }
        };

        try {
            const data = await api.get<Record<string, unknown>>(`/characters/${characterId}`);

            charState.setCharacter({
                characterId: data.id as string,
                name: data.name as string,
                race: data.race as string,
                classLevel: data.classLevel as string,
                level: data.level as number,
                alignment: data.alignment as string,
                strength: data.strength as number,
                dexterity: data.dexterity as number,
                constitution: data.constitution as number,
                intelligence: data.intelligence as number,
                wisdom: data.wisdom as number,
                charisma: data.charisma as number,
                hitPointsMax: data.hitPointsMax as number,
                hitPointsCurrent: data.hitPointsCurrent as number,
                armorClass: data.armorClass as number,
                baseAttackBonus: data.baseAttackBonus as number,
                initiative: data.initiative as number,
                speed: data.speed as number,
                saveFort: data.saveFort as number,
                saveRef: data.saveRef as number,
                saveWill: data.saveWill as number,
                pspMax: data.pspMax as number,
                pspCurrent: data.pspCurrent as number,
                currencyCp: (data.currencyCp as number) || 0,
                currencySp: (data.currencySp as number) || 0,
                currencyGp: (data.currencyGp as number) || 0,
                currencyBits: (data.currencyBits as number) || 0,
                experiencePoints: (data.experiencePoints as number) || 0,
                skills: safeJsonParse(data.skills, []),
                feats: safeJsonParse(data.feats, []),
                powers: safeJsonParse(data.powers, []),
                equipment: safeJsonParse(data.equipment, []),
                spells: safeJsonParse(data.spells, []),
                spellSlots: safeJsonParse(data.spellSlots, []),
                notes: data.notes as string,
                acArmor: (data.acArmor as number) || 0,
                acShield: (data.acShield as number) || 0,
                acNatural: (data.acNatural as number) || 0,
                acDeflection: (data.acDeflection as number) || 0,
                acMisc: (data.acMisc as number) || 0,
                acSizeMod: (data.acSizeMod as number) || 0,
                gender: (data.gender as string) || '',
                age: (data.age as string) || '',
                height: (data.height as string) || '',
                weight: (data.weight as string) || '',
                deity: (data.deity as string) || '',
                appearance: (data.appearance as string) || '',
                personality: (data.personality as string) || '',
                conditions: safeJsonParse(data.conditions, []),
                classLevels: safeJsonParse(data.classLevels, []),
                classFeatures: safeJsonParse(data.classFeatures, []),
                levelHistory: safeJsonParse(data.levelHistory, []),
                waterSupply: (data.waterSupply as number) || 0,
                dehydrationStage: (data.dehydrationStage as number) || 0,
                heatSicknessStage: (data.heatSicknessStage as number) || 0,
                heatExposureHours: (data.heatExposureHours as number) || 0,
                marchHoursToday: (data.marchHoursToday as number) || 0,
                forcedMarchStage: (data.forcedMarchStage as number) || 0,
            });
            setRightPanel('sheet');
        } catch (err) {
            console.error('Failed to load character:', err);
        }
    }, [charState]);

    const handleCreateCharacter = useCallback(async (data: Record<string, unknown>) => {
        try {
            const character = await api.post<{ id?: string }>('/characters', data);
            if (character.id) {
                handleSelectCharacter(character.id);
                setCharacterCount((prev) => prev + 1);
            }
        } catch (err) {
            console.error('Character creation failed:', err);
        }
    }, [handleSelectCharacter]);

    const handleDeleteCharacter = useCallback(async (characterId: string) => {
        try {
            await api.delete(`/characters/${characterId}`);
            // If the deleted character is currently loaded, clear it
            if (charState.characterId === characterId) {
                charState.setCharacter({
                    characterId: null,
                    name: '',
                    race: '',
                    classLevel: '',
                    level: 1,
                    alignment: 'N',
                    strength: 10, dexterity: 10, constitution: 10,
                    intelligence: 10, wisdom: 10, charisma: 10,
                    hitPointsMax: 1, hitPointsCurrent: 1,
                    armorClass: 10, baseAttackBonus: 0, initiative: 0, speed: 30,
                    saveFort: 0, saveRef: 0, saveWill: 0,
                    pspMax: 0, pspCurrent: 0,
                    currencyCp: 0, currencySp: 0, currencyGp: 0, currencyBits: 0,
                    experiencePoints: 0,
                    skills: [], feats: [], powers: [], equipment: [],
                    spells: [], spellSlots: [], notes: '',
                    acArmor: 0, acShield: 0, acNatural: 0, acDeflection: 0, acMisc: 0, acSizeMod: 0,
                    gender: '', age: '', height: '', weight: '', deity: '', appearance: '', personality: '',
                    conditions: [], classLevels: [],
                });
            }
            setCharacterCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Character deletion failed:', err);
        }
    }, [charState]);

    const handleSetMap = useCallback(async (url: string) => {
        try {
            gameState.setMapImage(url);
            await api.patch(`/campaigns/${session?.campaignId}`, { mapImageUrl: url });
        } catch (err) {
            console.error('Set map failed:', err);
        }
    }, [session, gameState]);

    const handleMapUpload = useCallback(async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const data = await api.upload<{ url: string }>('/uploads', formData);
            if (data.url) {
                gameState.setMapImage(data.url);
                // Persist map URL to campaign
                await api.patch(`/campaigns/${session?.campaignId}`, { mapImageUrl: data.url });
            }
        } catch (err) {
            console.error('Map upload failed:', err);
        }
    }, [session, gameState]);

    const handleTokenUpload = useCallback(async (file: File, label: string) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const data = await api.upload<{ url: string }>('/uploads', formData);
            if (data.url) {
                emit?.(SocketEvents.CLIENT_ADD_TOKEN, {
                    imageUrl: data.url,
                    x: 200,
                    y: 200,
                    label,
                    size: 50,
                });
            }
        } catch (err) {
            console.error('Token upload failed:', err);
        }
    }, [emit]);

    if (!session) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-obsidian-500 animate-pulse">Entering the wastes...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left toolbar (GM only) */}
            {isGM && (
                <GMToolbar
                    activeTool={activeTool}
                    brushSize={brushSize}
                    onToolChange={setActiveTool}
                    onBrushSizeChange={setBrushSize}
                    onMapUpload={handleMapUpload}
                    onTokenUpload={handleTokenUpload}
                    onFogReset={handleFogReset}
                    onDefileReset={handleDefileReset}
                    onSetMap={handleSetMap}
                />
            )}

            {/* Center — Map Canvas */}
            <main className="flex-1 relative bg-obsidian-950">
                <MapCanvas
                    activeTool={activeTool}
                    brushSize={brushSize}
                    isGM={isGM}
                    onFogReveal={handleFogReveal}
                    onDefilePlaced={handleDefilePlaced}
                    onTokenMoved={handleTokenMoved}
                />

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-obsidian-900/80 backdrop-blur-sm border-b border-obsidian-700/50 flex items-center px-3 justify-between z-10">
                    <div className="flex items-center gap-2">
                        <span className="font-display text-xs text-sand-500 tracking-wider">{session.campaignName}</span>
                        <span className="text-obsidian-600">•</span>
                        <span className="text-xs text-obsidian-500">
                            {gameState.connectedUsers.length} connected
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Connection status indicator */}
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${isConnected
                                ? 'bg-emerald-500'
                                : 'bg-crimson animate-pulse'
                                }`}
                            title={isConnected ? 'Connected' : 'Disconnected — reconnecting...'}
                        />
                        {!isConnected && (
                            <span className="text-xs text-crimson-light animate-pulse">
                                Reconnecting...
                            </span>
                        )}
                        <span className="text-xs text-obsidian-400">{session.username}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-sm font-display tracking-wider ${isGM ? 'bg-crimson/30 text-crimson-light' : 'bg-sand-500/20 text-sand-500'
                            }`}>
                            {session.role}
                        </span>
                    </div>
                </div>
            </main>

            {/* Right sidebar */}
            <aside className="w-80 bg-obsidian-900 border-l border-obsidian-700 flex flex-col">
                {/* Panel tabs */}
                <div className="flex border-b border-obsidian-700">
                    <button
                        onClick={() => setRightPanel('chat')}
                        className={`flex-1 py-1.5 text-xs font-display uppercase tracking-wider transition-colors ${rightPanel === 'chat'
                            ? 'text-sand-300 border-b-2 border-sand-500'
                            : 'text-obsidian-500 hover:text-obsidian-300'
                            }`}
                    >
                        Chronicle
                    </button>
                    <button
                        onClick={() => setRightPanel('sheet')}
                        className={`flex-1 py-1.5 text-xs font-display uppercase tracking-wider transition-colors ${rightPanel === 'sheet'
                            ? 'text-sand-300 border-b-2 border-sand-500'
                            : 'text-obsidian-500 hover:text-obsidian-300'
                            }`}
                    >
                        Character
                    </button>
                    {isGM && (
                        <button
                            onClick={() => setRightPanel('survival')}
                            className={`flex-1 py-1.5 text-xs font-display uppercase tracking-wider transition-colors ${rightPanel === 'survival'
                                ? 'text-sand-300 border-b-2 border-sand-500'
                                : 'text-obsidian-500 hover:text-obsidian-300'
                                }`}
                        >
                            Survival
                        </button>
                    )}
                </div>

                {/* Panel content */}
                <div className="flex-1 flex flex-col min-h-0">
                    {rightPanel === 'chat' ? (
                        <>
                            <ChatLog
                                messages={chatMessages}
                                onSendMessage={handleChatMessage}
                                currentUserId={session.userId}
                            />
                            <DiceTray onRoll={handleDiceRoll} />
                        </>
                    ) : rightPanel === 'sheet' ? (
                        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                            {isGM && (
                                <PlayerSheetViewer
                                    campaignId={session.campaignId}
                                    onSelectCharacter={handleSelectCharacter}
                                    on={on}
                                />
                            )}
                            <div className="border-t border-obsidian-700 flex-1">
                                <CharacterSheet
                                    onFieldChange={handleSheetFieldChange}
                                    onUsePower={handleUsePower}
                                    onCreateCharacter={handleCreateCharacter}
                                    onDeleteCharacter={handleDeleteCharacter}
                                    isGM={isGM}
                                    characterCount={characterCount}
                                    readOnly={false}
                                />
                            </div>
                        </div>
                    ) : (
                        <GMSurvivalDashboard
                            campaignId={session.campaignId}
                            on={on}
                        />
                    )}
                </div>
            </aside>
        </div>
    );
}
