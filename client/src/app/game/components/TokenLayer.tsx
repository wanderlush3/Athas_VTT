'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Group, Image as KonvaImage, Circle, Text } from 'react-konva';
import Konva from 'konva';
import type { Token } from '@/types/game';
import { getAssetUrl } from '@/lib/api';

interface TokenLayerProps {
    tokens: Token[];
    draggable: boolean;
    onTokenDragEnd?: (tokenId: string, x: number, y: number) => void;
}

const TokenLayerInner = React.memo(function TokenLayer({ tokens, draggable, onTokenDragEnd }: TokenLayerProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loadedCount, setLoadedCount] = useState(0);
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const inFlightRef = useRef<Set<string>>(new Set());

    // Load images in an effect, not during render
    useEffect(() => {
        const neededUrls = new Set(tokens.map((t) => t.imageUrl));

        // Evict cached entries no longer needed
        for (const url of imageCache.current.keys()) {
            if (!neededUrls.has(url)) {
                imageCache.current.delete(url);
            }
        }
        // Evict in-flight entries no longer needed
        for (const url of inFlightRef.current) {
            if (!neededUrls.has(url)) {
                inFlightRef.current.delete(url);
            }
        }

        // Start loading any missing images
        for (const url of neededUrls) {
            if (imageCache.current.has(url) || inFlightRef.current.has(url)) continue;
            inFlightRef.current.add(url);
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.src = getAssetUrl(url);
            img.onload = () => {
                imageCache.current.set(url, img);
                inFlightRef.current.delete(url);
                setLoadedCount((c) => c + 1);
            };
            img.onerror = () => {
                inFlightRef.current.delete(url);
            };
        }
    }, [tokens]);

    // Pure synchronous cache lookup — no side effects
    const getImage = useCallback((url: string): HTMLImageElement | null => {
        return imageCache.current.get(url) || null;
    }, []);

    return (
        <>
            {tokens.map((token) => {
                const img = getImage(token.imageUrl);
                const isSelected = selectedId === token.id;
                const size = token.size || 50;

                return (
                    <Group
                        key={token.id}
                        x={token.x}
                        y={token.y}
                        draggable={draggable}
                        onDragStart={(e: Konva.KonvaEventObject<DragEvent>) => {
                            // Stop the stage from capturing this as a pan/tool event
                            e.cancelBubble = true;
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grabbing';
                        }}
                        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                            e.cancelBubble = true;
                            const group = e.currentTarget;
                            onTokenDragEnd?.(token.id, group.x(), group.y());
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'default';
                        }}
                        onClick={() => setSelectedId(token.id === selectedId ? null : token.id)}
                        onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container && draggable) container.style.cursor = 'grab';
                        }}
                        onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'default';
                        }}
                    >
                        {/* Token image or placeholder circle */}
                        {img ? (
                            <KonvaImage
                                image={img}
                                width={size}
                                height={size}
                                offsetX={size / 2}
                                offsetY={size / 2}
                                cornerRadius={size / 2}
                            />
                        ) : (
                            <Circle
                                radius={size / 2}
                                fill="#d47f1e"
                                stroke="#f9ecd8"
                                strokeWidth={2}
                            />
                        )}

                        {/* Selection ring */}
                        {isSelected && (
                            <Circle
                                radius={size / 2 + 4}
                                stroke="#d47f1e"
                                strokeWidth={2}
                                dash={[6, 3]}
                            />
                        )}

                        {/* Label */}
                        <Text
                            text={token.label}
                            fontSize={11}
                            fill="#f9ecd8"
                            fontFamily="Inter, sans-serif"
                            align="center"
                            width={size + 20}
                            offsetX={(size + 20) / 2}
                            y={size / 2 + 4}
                            shadowColor="#000"
                            shadowBlur={3}
                            shadowOffsetX={1}
                            shadowOffsetY={1}
                        />
                    </Group>
                );
            })}
        </>
    );
});

export { TokenLayerInner as TokenLayer };
