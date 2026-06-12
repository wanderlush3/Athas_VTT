import { create } from 'zustand';
import type { ClassEntry, LevelUpRecord, Skill, Feat, PsionicPower, EquipmentItem, Spell, SpellSlots, ClassFeature } from 'athas-shared';

interface CharacterState {
    characterId: string | null;
    name: string;
    race: string;
    classLevel: string;
    level: number;
    alignment: string;

    // Ability Scores
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;

    // Combat
    hitPointsMax: number;
    hitPointsCurrent: number;
    armorClass: number;
    baseAttackBonus: number;
    initiative: number;
    speed: number;

    // Saves
    saveFort: number;
    saveRef: number;
    saveWill: number;

    // Psionics
    pspMax: number;
    pspCurrent: number;

    // Currency
    currencyCp: number;
    currencySp: number;
    currencyGp: number;
    currencyBits: number;

    // Experience
    experiencePoints: number;

    // JSON data (parsed)
    skills: Skill[];
    feats: Feat[];
    powers: PsionicPower[];
    equipment: EquipmentItem[];
    spells: Spell[];
    spellSlots: SpellSlots[];
    notes: string;

    // AC Components
    acArmor: number;
    acShield: number;
    acNatural: number;
    acDeflection: number;
    acMisc: number;
    acSizeMod: number;

    // Description
    gender: string;
    age: string;
    height: string;
    weight: string;
    deity: string;
    appearance: string;
    personality: string;

    // Conditions
    conditions: string[];

    // Multiclass
    classLevels: ClassEntry[];

    // Class features from leveling
    classFeatures: ClassFeature[];

    // Level-up history for undo
    levelHistory: LevelUpRecord[];

    // Survival
    waterSupply: number;
    dehydrationStage: number;
    heatSicknessStage: number;
    heatExposureHours: number;
    marchHoursToday: number;
    forcedMarchStage: number;

    // Actions
    setCharacter: (data: Partial<CharacterState>) => void;
    updateField: (field: string, value: string | number | boolean | string[] | unknown[]) => void;
    deductPsp: (cost: number) => void;
}

export const useCharacter = create<CharacterState>((set) => ({
    characterId: null,
    name: '',
    race: '',
    classLevel: '',
    level: 1,
    alignment: 'N',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    hitPointsMax: 1,
    hitPointsCurrent: 1,
    armorClass: 10,
    baseAttackBonus: 0,
    initiative: 0,
    speed: 30,
    saveFort: 0,
    saveRef: 0,
    saveWill: 0,
    pspMax: 0,
    pspCurrent: 0,
    currencyCp: 0,
    currencySp: 0,
    currencyGp: 0,
    currencyBits: 0,
    experiencePoints: 0,
    skills: [],
    feats: [],
    powers: [],
    equipment: [],
    spells: [],
    spellSlots: [],
    notes: '',
    acArmor: 0,
    acShield: 0,
    acNatural: 0,
    acDeflection: 0,
    acMisc: 0,
    acSizeMod: 0,
    gender: '',
    age: '',
    height: '',
    weight: '',
    deity: '',
    appearance: '',
    personality: '',
    conditions: [],
    classLevels: [],
    classFeatures: [],
    levelHistory: [],
    waterSupply: 0,
    dehydrationStage: 0,
    heatSicknessStage: 0,
    heatExposureHours: 0,
    marchHoursToday: 0,
    forcedMarchStage: 0,

    setCharacter: (data) => set((s) => ({ ...s, ...data })),
    updateField: (field, value) => set((s) => ({ ...s, [field]: value })),
    // Zustand's set() does a shallow merge by default, so partial updates are safe
    deductPsp: (cost) => set((s) => ({ pspCurrent: Math.max(0, s.pspCurrent - cost) })),
}));
