'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/**
 * Lobby Page — Campaign login / join screen.
 * Players enter a campaign name, password, and username to join.
 */
export default function LobbyPage() {
    const router = useRouter();
    const [campaignName, setCampaignName] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'PLAYER' | 'GM'>('PLAYER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

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
