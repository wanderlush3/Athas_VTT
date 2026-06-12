'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { TokenLayer } from './TokenLayer';
import { FogOfWar } from './FogOfWar';
import { DefileOverlay } from './DefileOverlay';
import { useGameState } from '@/hooks/useGameState';
import { getAssetUrl } from '@/lib/api';

interface MapCanvasProps {
    activeTool: string;
    brushSize: number;
    isGM: boolean;
    onFogReveal?: (points: Array<{ x: number; y: number }>, brushSize: number) => void;
    onDefilePlaced?: (x: number, y: number, radius: number) => void;
    onTokenMoved?: (tokenId: string, x: number, y: number) => void;
}

export function MapCanvas({
    activeTool,
    brushSize,
    isGM,
    onFogReveal,
    onDefilePlaced,
    onTokenMoved,
}: MapCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [stageScale, setStageScale] = useState(1);
    const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [isDrawingFog, setIsDrawingFog] = useState(false);
    const [fogStrokePoints, setFogStrokePoints] = useState<Array<{ x: number; y: number }>>([]);
    const [defilePreview, setDefilePreview] = useState<{ x: number; y: number; radius: number } | null>(null);
    const [defileStart, setDefileStart] = useState<{ x: number; y: number } | null>(null);

    const { mapImageUrl, tokens, defileZones } = useGameState();

    // ── Resize observer ────────────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(container);
        setDimensions({ width: container.offsetWidth, height: container.offsetHeight });

        return () => observer.disconnect();
    }, []);

    // ── Load map image ─────────────────────────────────────────────
    useEffect(() => {
        if (!mapImageUrl) {
            setMapImage(null);
            return;
        }

        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = getAssetUrl(mapImageUrl);
        img.onload = () => setMapImage(img);
    }, [mapImageUrl]);

    // ── Zoom with mouse wheel ──────────────────────────────────────
    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const scaleBy = 1.08;
        const oldScale = stageScale;
        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        const clampedScale = Math.max(0.1, Math.min(5, newScale));

        const mousePointTo = {
            x: (pointer.x - stagePos.x) / oldScale,
            y: (pointer.y - stagePos.y) / oldScale,
        };

        setStageScale(clampedScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        });
    }, [stageScale, stagePos]);

    // ── Get world-space pointer position ───────────────────────────
    const getWorldPos = useCallback((): { x: number; y: number } | null => {
        const stage = stageRef.current;
        if (!stage) return null;
        const pointer = stage.getPointerPosition();
        if (!pointer) return null;
        return {
            x: (pointer.x - stagePos.x) / stageScale,
            y: (pointer.y - stagePos.y) / stageScale,
        };
    }, [stagePos, stageScale]);

    // ── Mouse handlers ─────────────────────────────────────────────
    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        // Middle mouse button → pan
        if (e.evt.button === 1) {
            setIsPanning(true);
            return;
        }

        if (e.evt.button !== 0) return;

        if (activeTool === 'fog_brush' && isGM) {
            setIsDrawingFog(true);
            const pos = getWorldPos();
            if (pos) setFogStrokePoints([pos]);
        } else if (activeTool === 'defile' && isGM) {
            const pos = getWorldPos();
            if (pos) {
                setDefileStart(pos);
                setDefilePreview({ x: pos.x, y: pos.y, radius: 0 });
            }
        } else if (activeTool === 'select') {
            // Token selection handled by TokenLayer
        }
    }, [activeTool, isGM, getWorldPos]);

    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (isPanning) {
            setStagePos((prev) => ({
                x: prev.x + e.evt.movementX,
                y: prev.y + e.evt.movementY,
            }));
            return;
        }

        if (isDrawingFog) {
            const pos = getWorldPos();
            if (pos) {
                setFogStrokePoints((prev) => [...prev, pos]);
            }
        }

        if (defileStart) {
            const pos = getWorldPos();
            if (pos) {
                const dx = pos.x - defileStart.x;
                const dy = pos.y - defileStart.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                setDefilePreview({ x: defileStart.x, y: defileStart.y, radius });
            }
        }
    }, [isPanning, isDrawingFog, defileStart, getWorldPos]);

    const handleMouseUp = useCallback(() => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (isDrawingFog && fogStrokePoints.length > 0) {
            onFogReveal?.(fogStrokePoints, brushSize);
            setIsDrawingFog(false);
            setFogStrokePoints([]);
        }

        if (defileStart && defilePreview && defilePreview.radius > 10) {
            onDefilePlaced?.(defilePreview.x, defilePreview.y, defilePreview.radius);
            setDefileStart(null);
            setDefilePreview(null);
        } else {
            setDefileStart(null);
            setDefilePreview(null);
        }
    }, [isPanning, isDrawingFog, fogStrokePoints, brushSize, defileStart, defilePreview, onFogReveal, onDefilePlaced]);

    // ── Cursor style based on tool ─────────────────────────────────
    const cursorStyle = activeTool === 'fog_brush' ? 'crosshair'
        : activeTool === 'defile' ? 'cell'
            : activeTool === 'token_place' ? 'copy'
                : 'default';

    return (
        <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ cursor: cursorStyle }}
        >
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                x={stagePos.x}
                y={stagePos.y}
                scaleX={stageScale}
                scaleY={stageScale}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={(e) => e.evt.preventDefault()}
            >
                {/* Layer 1: Map background */}
                <Layer>
                    {mapImage ? (
                        <KonvaImage image={mapImage} x={0} y={0} />
                    ) : (
                        <Rect
                            x={0} y={0}
                            width={2000} height={2000}
                            fill="#2d2824"
                        />
                    )}
                </Layer>

                {/* Layer 2: Defiling zones (visual only — no event capture) */}
                <Layer listening={false}>
                    <DefileOverlay zones={defileZones} preview={defilePreview} />
                </Layer>

                {/* Layer 3: Fog of War (visual only — no event capture) */}
                <Layer listening={false}>
                    <FogOfWar
                        mapWidth={mapImage?.width || 2000}
                        mapHeight={mapImage?.height || 2000}
                        currentStroke={isDrawingFog ? fogStrokePoints : []}
                        brushSize={brushSize}
                    />
                </Layer>

                {/* Layer 4: Tokens (interactive — on top for drag handling) */}
                <Layer>
                    <TokenLayer
                        tokens={tokens}
                        draggable={true}
                        onTokenDragEnd={onTokenMoved}
                    />
                </Layer>
            </Stage>

            {/* Empty state */}
            {!mapImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <p className="font-display text-4xl mb-2 text-obsidian-600">⚔️</p>
                        <p className="text-sm text-obsidian-500">No map loaded</p>
                        {isGM && (
                            <p className="text-xs text-obsidian-600 mt-1">Upload a map from the toolbar</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
