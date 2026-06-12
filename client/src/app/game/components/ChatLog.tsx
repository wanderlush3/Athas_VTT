'use client';

import React, { useRef, useEffect, useState } from 'react';

interface ChatEntry {
    id: string;
    type: 'CHAT' | 'ROLL' | 'SYSTEM';
    userId: string;
    username: string;
    content: string;
    timestamp: string;
    rollData?: {
        dice: Array<{ type: string; count: number }>;
        results: number[];
        total: number;
        formula: string;
    };
}

interface ChatLogProps {
    messages: ChatEntry[];
    onSendMessage: (content: string) => void;
    currentUserId: string;
}

interface ChatMessageProps {
    msg: ChatEntry;
    currentUserId: string;
}

const formatTime = (ts: string) => {
    try {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const ChatMessage = React.memo(function ChatMessage({ msg, currentUserId }: ChatMessageProps) {
    return (
        <div className="group">
            {msg.type === 'SYSTEM' ? (
                /* System message */
                <div className="text-xs text-sand-600 italic py-0.5 border-l-2 border-obsidian-700 pl-2">
                    {msg.content}
                </div>
            ) : msg.type === 'ROLL' ? (
                /* Dice roll */
                <div className="bg-obsidian-800/60 rounded-sm p-2 border border-obsidian-700/50">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-display text-sand-400">{msg.username}</span>
                        <span className="text-sm text-obsidian-500">{formatTime(msg.timestamp)}</span>
                    </div>
                    {msg.rollData && (
                        <div className="space-y-1">
                            <div className="text-xs text-obsidian-300 font-mono">
                                {msg.rollData.formula}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {msg.rollData.results.map((r, i) => (
                                    <span
                                        key={i}
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-sm text-xs font-bold
                            ${r === 20 ? 'bg-sand-500 text-obsidian-950 shadow-md shadow-sand-500/40' :
                                                        r === 1 ? 'bg-crimson text-sand-100' :
                                                            'bg-obsidian-700 text-sand-200'}`}
                                    >
                                        {r}
                                    </span>
                                ))}
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-display font-bold text-sand-200">
                                    {msg.rollData.total}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Regular chat message */
                <div className="flex gap-1.5 items-start">
                    <span className={`text-xs font-display font-semibold shrink-0 ${msg.userId === currentUserId ? 'text-sand-400' : 'text-sand-600'
                        }`}>
                        {msg.username}:
                    </span>
                    <span className="text-xs text-obsidian-200 break-words">{msg.content}</span>
                    <span className="text-sm text-obsidian-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(msg.timestamp)}
                    </span>
                </div>
            )}
        </div>
    );
});

function ChatLogInner({ messages, onSendMessage, currentUserId }: ChatLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isNearBottom = useRef(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 50;
        isNearBottom.current = nearBottom;
        if (nearBottom) setHasNewMessages(false);
    };

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            if (isNearBottom.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            } else {
                setHasNewMessages(true);
            }
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const input = inputRef.current;
        if (!input || !input.value.trim()) return;
        onSendMessage(input.value.trim());
        input.value = '';
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 relative">
            <h3 className="font-display text-xs text-sand-500 uppercase tracking-widest px-3 pt-3 pb-1">
                Chronicle
            </h3>

            {/* Message list */}
            <div ref={scrollRef} role="log" aria-live="polite" onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-2 scrollbar-thin relative">
                {messages.length === 0 && (
                    <p className="text-xs italic text-obsidian-500 mt-2">The chronicle awaits...</p>
                )}
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} msg={msg} currentUserId={currentUserId} />
                ))}
            </div>
            {hasNewMessages && (
                <button
                    onClick={() => {
                        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                        setHasNewMessages(false);
                    }}
                    className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-amber-600 text-obsidian-950 rounded-full px-3 py-1 text-xs font-bold shadow-lg z-10"
                >
                    New messages ↓
                </button>
            )}

            {/* Chat input */}
            <form onSubmit={handleSubmit} className="p-2 border-t border-obsidian-700/50">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Send a message..."
                        aria-label="Chat message"
                        className="flex-1 px-3 py-1.5 bg-obsidian-800 border border-obsidian-600 rounded-sm text-xs text-sand-200
                       placeholder-obsidian-500 focus:outline-none focus:border-sand-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        className="px-3 py-1.5 bg-obsidian-700 border border-obsidian-600 rounded-sm text-xs text-sand-400
                       hover:bg-obsidian-600 hover:text-sand-300 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}

export const ChatLog = React.memo(ChatLogInner);

