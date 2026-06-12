// ─── Enums & Constants for Athas VTT ─────────────────────────────
// Pure enum definitions. All interfaces live in types.ts.

export enum PsionicDiscipline {
    Clairsentience = 'Clairsentience',
    Metacreativity = 'Metacreativity',
    Psychokinesis = 'Psychokinesis',
    Psychometabolism = 'Psychometabolism',
    Psychoportation = 'Psychoportation',
    Telepathy = 'Telepathy',
}

export enum DarkSunRace {
    Human = 'Human',
    Elf = 'Elf',
    HalfElf = 'Half-Elf',
    Dwarf = 'Dwarf',
    Mul = 'Mul',
    HalfGiant = 'Half-Giant',
    ThriKreen = 'Thri-Kreen',
    Halfling = 'Halfling',
    Pterran = 'Pterran',
    Aarakocra = 'Aarakocra',
    Dray = 'Dray',
}

export enum DarkSunClass {
    Fighter = 'Fighter',
    Gladiator = 'Gladiator',
    Ranger = 'Ranger',
    Rogue = 'Rogue',
    Bard = 'Bard',
    Cleric = 'Cleric',
    Druid = 'Druid',
    Psionicist = 'Psionicist',
    Defiler = 'Defiler',
    Preserver = 'Preserver',
    Templar = 'Templar',
}

export enum Alignment {
    LawfulGood = 'Lawful Good',
    NeutralGood = 'Neutral Good',
    ChaoticGood = 'Chaotic Good',
    LawfulNeutral = 'Lawful Neutral',
    TrueNeutral = 'True Neutral',
    ChaoticNeutral = 'Chaotic Neutral',
    LawfulEvil = 'Lawful Evil',
    NeutralEvil = 'Neutral Evil',
    ChaoticEvil = 'Chaotic Evil',
}

export enum MessageType {
    Chat = 'CHAT',
    Roll = 'ROLL',
    System = 'SYSTEM',
}

export enum SpellSchool {
    Abjuration = 'Abjuration',
    Conjuration = 'Conjuration',
    Divination = 'Divination',
    Enchantment = 'Enchantment',
    Evocation = 'Evocation',
    Illusion = 'Illusion',
    Necromancy = 'Necromancy',
    Transmutation = 'Transmutation',
    // Cleric elemental domains (Dark Sun)
    Air = 'Air',
    Earth = 'Earth',
    Fire = 'Fire',
    Water = 'Water',
    // Templar domain
    Cosmos = 'Cosmos',
}

// Re-export all types from types.ts for backward compatibility.
// Consumers importing from 'athas-shared' or './enums' will still resolve all types.
export type {
    Skill,
    Feat,
    PsionicPower,
    GrantedPower,
    EquipmentItem,
    Spell,
    SpellSlots,
    CompendiumPsionic,
    CompendiumEquipment,
    CompendiumSpell,
    PrereqAbilityScore,
    PrereqSkillRank,
    PrereqClassLevel,
    StructuredPrereqs,
    CompendiumFeat,
    RaceData,
    ClassFeature,
    SpellProgressionTable,
    PsionicProgressionTable,
    ClassData,
    LevelUpRecord,
    Currency,
} from './types';
