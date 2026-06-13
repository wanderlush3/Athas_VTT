'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, setServerUrl, clearServerUrl, getStoredServerUrl } from '@/lib/api';

/**
 * Lobby Page — Campaign login / join screen.
 * Players enter a server address, campaign name, password, and username to join.
 */
export default function LobbyPage() {
    const router = useRouter();
    const [campaignName, setCampaignName] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'PLAYER' | 'GM'>('PLAYER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Server Address ───────────────────────────────────────────
    const [serverAddress, setServerAddress] = useState('');
    const [serverExpanded, setServerExpanded] = useState(false);
    const [serverStatus, setServerStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');

    // Load stored server address on mount
    useEffect(() => {
        const stored = getStoredServerUrl();
        if (stored) {
            setServerAddress(stored);
            setServerExpanded(true);
        }
    }, []);

    /**
     * Normalize a raw server address input into a full URL.
     * Handles: "192.168.1.5:3000" → "http://192.168.1.5:3000"
     */
    const normalizeServerUrl = (raw: string): string => {
        let url = raw.trim().replace(/\/+$/, ''); // trim + strip trailing slashes
        if (!url) return '';
        if (!/^https?:\/\//i.test(url)) {
            url = `http://${url}`;
        }
        return url;
    };

    /**
     * Apply the server address: normalize, store in localStorage, and ping health.
     */
    const applyServerAddress = useCallback((raw: string) => {
        const normalized = normalizeServerUrl(raw);
        if (normalized) {
            setServerUrl(normalized);
        } else {
            clearServerUrl();
        }
    }, []);

    /**
     * Ping the server's health endpoint.
     */
    const checkServerHealth = useCallback(async () => {
        setServerStatus('checking');
        try {
            await api.get<{ status: string }>('/health');
            setServerStatus('online');
        } catch {
            setServerStatus('offline');
        }
    }, []);

    // Check health when server address changes (debounced)
    useEffect(() => {
        applyServerAddress(serverAddress);
        const timer = setTimeout(() => {
            checkServerHealth();
        }, 500);
        return () => clearTimeout(timer);
    }, [serverAddress, applyServerAddress, checkServerHealth]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Ensure server URL is applied before joining
        applyServerAddress(serverAddress);

        try {
            const data = await api.post<any>('/auth/join', { campaignName, password, username, role });

            // Store session in localStorage
            localStorage.setItem('athas_session', JSON.stringify(data));

            // Navigate to game
            router.push('/game');
        } catch (err: any) {
            setError(err.message || 'Cannot connect to server. Is it running?');
        } finally {
            setLoading(false);
        }
    };

    const statusIcon = {
        unknown: '⚪',
        checking: '🔄',
        online: '🟢',
        offline: '🔴',
    }[serverStatus];

    const statusText = {
        unknown: '',
        checking: 'Checking...',
        online: 'Connected',
        offline: 'Unreachable',
    }[serverStatus];

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-display font-bold text-sand-300 tracking-wider mb-2">
                        ATHAS VTT
                    </h1>
                    <p className="text-obsidian-400 text-sm italic">
                        Under the crimson sun, the sands await...
                    </p>
                </div>

                {/* Server Address Section */}
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => setServerExpanded(!serverExpanded)}
                        className="flex items-center gap-2 text-xs text-obsidian-400 hover:text-sand-300 transition-colors duration-200 uppercase tracking-wider font-medium"
                    >
                        <span className="text-[10px]">{serverExpanded ? '▼' : '▶'}</span>
                        ⚙ Server Connection
                        {!serverExpanded && serverStatus !== 'unknown' && (
                            <span className="ml-1">{statusIcon}</span>
                        )}
                    </button>

                    {serverExpanded && (
                        <div className="mt-2 p-3 bg-obsidian-800/50 border border-obsidian-700 rounded-sm">
                            <div className="flex items-center gap-2">
                                <input
                                    id="serverAddress"
                                    type="text"
                                    className="input-field flex-1 text-sm"
                                    placeholder="localhost:3000 (default)"
                                    value={serverAddress}
                                    onChange={(e) => setServerAddress(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={checkServerHealth}
                                    className="px-2 py-2 bg-obsidian-700 hover:bg-obsidian-600 text-obsidian-300 rounded-sm text-sm transition-colors duration-200"
                                    aria-label="Check server status"
                                    title="Check connection"
                                >
                                    🔍
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[11px] text-obsidian-500">
                                    Leave empty for localhost
                                </span>
                                <span className={`text-[11px] flex items-center gap-1 ${
                                    serverStatus === 'online' ? 'text-emerald-400' :
                                    serverStatus === 'offline' ? 'text-red-400' :
                                    'text-obsidian-400'
                                }`}>
                                    {statusIcon} {statusText}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label htmlFor="campaignName" className="label">Campaign Name</label>
                        <input
                            id="campaignName"
                            type="text"
                            className="input-field"
                            placeholder="The Wanderer's Chronicle"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="label">Campaign Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input-field"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="username" className="label">Your Name</label>
                        <input
                            id="username"
                            type="text"
                            className="input-field"
                            placeholder="Rikus of Tyr"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Role</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                className={`flex-1 py-2 rounded-sm font-display text-sm tracking-wide transition-all duration-200 ${role === 'PLAYER'
                                        ? 'bg-sand-500 text-obsidian-950'
                                        : 'bg-obsidian-800 text-obsidian-400 hover:text-sand-300'
                                    }`}
                                onClick={() => setRole('PLAYER')}
                            >
                                Player
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-2 rounded-sm font-display text-sm tracking-wide transition-all duration-200 ${role === 'GM'
                                        ? 'bg-crimson text-sand-100'
                                        : 'bg-obsidian-800 text-obsidian-400 hover:text-sand-300'
                                    }`}
                                onClick={() => setRole('GM')}
                            >
                                Game Master
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="text-crimson-light text-sm text-center py-2 bg-crimson-dark/20 rounded-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary w-full text-center"
                        disabled={loading}
                    >
                        {loading ? 'Entering the Wastes...' : 'Enter Campaign'}
                    </button>
                </form>
            </div>
        </div>
    );
}
