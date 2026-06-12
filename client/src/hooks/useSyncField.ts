import { useCallback } from 'react';

type FieldValue = string | number | boolean | string[] | unknown[];
type SyncFieldFn = (field: string, value: FieldValue) => void;
type SyncFieldsFn = (updates: [string, FieldValue][]) => void;

/**
 * Eliminates the duplicated `char.updateField()` + `onFieldChange()` two-line pattern.
 *
 * Returns:
 *   - `syncField(field, value)`: updates local Zustand store and emits socket event
 *   - `syncFields(updates)`: batch variant — updates multiple fields, emits each to server
 */
export function useSyncField(
    char: { characterId: string | null; updateField: (field: string, value: FieldValue) => void },
    onFieldChange: (characterId: string, field: string, value: string | number | boolean) => void,
): { syncField: SyncFieldFn; syncFields: SyncFieldsFn } {
    const syncField: SyncFieldFn = useCallback(
        (field: string, value: FieldValue) => {
            if (!char.characterId) return;
            char.updateField(field, value);
            // JSON-stringify arrays/objects for the socket emission
            const emitValue = typeof value === 'object' ? JSON.stringify(value) : value;
            onFieldChange(char.characterId, field, emitValue);
        },
        [char.characterId, char.updateField, onFieldChange],
    );

    const syncFields: SyncFieldsFn = useCallback(
        (updates: [string, FieldValue][]) => {
            if (!char.characterId) return;
            for (const [field, value] of updates) {
                char.updateField(field, value);
                const emitValue = typeof value === 'object' ? JSON.stringify(value) : value;
                onFieldChange(char.characterId, field, emitValue);
            }
        },
        [char.characterId, char.updateField, onFieldChange],
    );

    return { syncField, syncFields };
}
