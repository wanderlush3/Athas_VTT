'use client';

import React, { useMemo } from 'react';
import { Rect, Line, Group } from 'react-konva';
import { useGameState } from '@/hooks/useGameState';

// Flatten points for Konva Line
const flattenPoints = (pts: Array<{ x: number; y: number }>): number[] => {
    return pts.flatMap((p) => [p.x, p.y]);
};

interface FogOfWarProps {
    mapWidth: number;
    mapHeight: number;
    currentStroke: Array<{ x: number; y: number }>;
    brushSize: number;
}

/**
 * Fog of War overlay.
 * Renders a full black rectangle, then uses 'destination-out' compositing
 * on reveal strokes to punch transparent holes through the fog.
 */
export function FogOfWar({ mapWidth, mapHeight, currentStroke, brushSize }: FogOfWarProps) {
    const { fogMask } = useGameState();

    // Parse the fog mask — array of stroke data
    const revealedStrokes = useMemo(() => {
        try {
            const parsed = typeof fogMask === 'string' ? JSON.parse(fogMask) : fogMask;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [fogMask]);

    return (
        <Group>
            {/* Full black fog cover */}
            <Rect
                x={-500}
                y={-500}
                width={mapWidth + 1000}
                height={mapHeight + 1000}
                fill="black"
            />

            {/* Revealed areas (punched out via compositing) */}
            {revealedStrokes.map((stroke, i) => (
                <Line
                    key={`fog-reveal-${i}`}
                    points={flattenPoints(stroke.points)}
                    stroke="white"
                    strokeWidth={stroke.brushSize}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation="destination-out"
                />
            ))}

            {/* Current drawing stroke (live preview) */}
            {currentStroke.length > 0 && (
                <Line
                    points={flattenPoints(currentStroke)}
                    stroke="white"
                    strokeWidth={brushSize}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation="destination-out"
                />
            )}
        </Group>
    );
}
