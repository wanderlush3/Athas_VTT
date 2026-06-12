'use client';

import React, { useEffect, useRef } from 'react';
import { Circle, Group } from 'react-konva';
import type { DefileZone } from '@/types/game';

interface DefileOverlayProps {
    zones: DefileZone[];
    preview: { x: number; y: number; radius: number } | null;
}

/**
 * Defiling Overlay — scorched earth circles.
 * Each zone renders as a semi-transparent circle with a cracked-earth pattern.
 * Falls back to a solid burnt fill if the pattern texture isn't loaded.
 */
export function DefileOverlay({ zones, preview }: DefileOverlayProps) {
    const textureRef = useRef<HTMLImageElement | null>(null);
    const [textureLoaded, setTextureLoaded] = React.useState(false);

    useEffect(() => {
        const img = new window.Image();
        img.src = '/textures/scorched-earth.png';
        img.onload = () => {
            textureRef.current = img;
            setTextureLoaded(true);
        };
        img.onerror = () => {
            // Texture not found — will use solid fill fallback
            textureRef.current = null;
        };
    }, []);

    const renderZone = (zone: { id?: string; x: number; y: number; radius: number }, key: string, isPreview = false) => {
        const baseProps = {
            x: zone.x,
            y: zone.y,
            radius: zone.radius,
            opacity: isPreview ? 0.4 : 0.7,
            listening: false,
        };

        if (textureLoaded && textureRef.current) {
            return (
                <Circle
                    key={key}
                    {...baseProps}
                    fillPatternImage={textureRef.current}
                    fillPatternRepeat="repeat"
                    fillPatternOffset={{ x: zone.x, y: zone.y }}
                />
            );
        }

        // Solid fallback — burnt sienna gradient effect
        return (
            <Circle
                key={key}
                {...baseProps}
                fill="#5c2d0a"
                stroke="#3d1f07"
                strokeWidth={2}
            />
        );
    };

    return (
        <Group>
            {zones.map((zone) => renderZone(zone, `defile-${zone.id}`))}
            {preview && preview.radius > 0 && renderZone(preview, 'defile-preview', true)}
        </Group>
    );
}
