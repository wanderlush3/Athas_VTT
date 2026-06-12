import { prisma } from './client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const SESSION_DURATION_MS = 21 * 24 * 60 * 60 * 1000; // 21 days

/**
 * Seed script — creates a sample Dark Sun campaign with a GM and a player character.
 * Run with: npm -w server run db:seed
 */
async function main() {
    console.log('🌄 Seeding Athas VTT database...');

    // Hash the demo campaign password
    const hashedPassword = await bcrypt.hash('athas', BCRYPT_ROUNDS);

    // Create a sample campaign
    const campaign = await prisma.campaign.upsert({
        where: { id: 'demo-campaign-001' },
        update: {},
        create: {
            id: 'demo-campaign-001',
            name: "The Wanderer's Chronicle",
            password: hashedPassword,
        },
    });
    console.log(`  Campaign: ${campaign.name}`);

    // Generate random session tokens
    const gmToken = uuidv4();
    const playerToken = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // Create GM user
    const gm = await prisma.user.upsert({
        where: { id: 'gm-user-001' },
        update: {},
        create: {
            id: 'gm-user-001',
            username: 'The Wanderer',
            role: 'GM',
            sessionToken: gmToken,
            expiresAt,
            campaignId: campaign.id,
        },
    });
    console.log(`  GM: ${gm.username}`);

    // Create player user
    const player = await prisma.user.upsert({
        where: { id: 'player-user-001' },
        update: {},
        create: {
            id: 'player-user-001',
            username: 'Rikus',
            role: 'PLAYER',
            sessionToken: playerToken,
            expiresAt,
            campaignId: campaign.id,
        },
    });
    console.log(`  Player: ${player.username}`);

    // Create a sample character — Rikus the Mul Gladiator
    const rikus = await prisma.character.upsert({
        where: { id: 'char-rikus-001' },
        update: {},
        create: {
            id: 'char-rikus-001',
            name: 'Rikus',
            race: 'Mul',
            classLevel: 'Gladiator 8',
            level: 8,
            alignment: 'Chaotic Good',
            strength: 20,
            dexterity: 16,
            constitution: 18,
            intelligence: 10,
            wisdom: 12,
            charisma: 8,
            hitPointsMax: 76,
            hitPointsCurrent: 76,
            armorClass: 18,
            baseAttackBonus: 8,
            initiative: 3,
            speed: 30,
            saveFort: 8,
            saveRef: 5,
            saveWill: 3,
            pspMax: 15,
            pspCurrent: 15,
            skills: JSON.stringify([
                { name: 'Intimidate', ranks: 11, modifier: 10, abilityMod: 'CHA', classSkill: true },
                { name: 'Jump', ranks: 6, modifier: 11, abilityMod: 'STR', classSkill: true },
                { name: 'Tumble', ranks: 8, modifier: 11, abilityMod: 'DEX', classSkill: true },
                { name: 'Survival', ranks: 4, modifier: 5, abilityMod: 'WIS', classSkill: false },
                { name: 'Perform (Gladiatorial)', ranks: 6, modifier: 5, abilityMod: 'CHA', classSkill: true },
            ]),
            feats: JSON.stringify([
                { name: 'Power Attack', description: 'Trade attack bonus for damage.' },
                { name: 'Cleave', description: 'Extra attack after dropping a foe.' },
                { name: 'Weapon Focus (Longsword)', description: '+1 to attack with longsword.' },
                { name: 'Improved Initiative', description: '+4 to initiative.' },
                { name: 'Exotic Weapon Proficiency (Fullblade)', description: 'Proficient with fullblade.' },
            ]),
            powers: JSON.stringify([
                {
                    name: 'Vigor',
                    discipline: 'Psychometabolism',
                    level: 1,
                    cost: 1,
                    description: 'Gain 5 temporary hit points.',
                    display: 'Material and olfactory',
                    range: 'Personal',
                    duration: '1 min./level',
                },
                {
                    name: 'Biofeedback',
                    discipline: 'Psychometabolism',
                    level: 2,
                    cost: 3,
                    description: 'Gain damage reduction 2/–.',
                    augments: 'For every 3 additional PP, DR increases by 1.',
                    display: 'Material and visual',
                    range: 'Personal',
                    duration: '1 round/level',
                },
                {
                    name: 'Body Adjustment',
                    discipline: 'Psychometabolism',
                    level: 3,
                    cost: 5,
                    description: 'Heal 1d12 points of damage.',
                    augments: 'For every 2 additional PP, heal an additional 1d12.',
                    display: 'Auditory and material',
                    range: 'Personal',
                    duration: 'Instantaneous',
                },
            ]),
            equipment: JSON.stringify([
                { id: 'eq-1', name: 'Obsidian Longsword', type: 'weapon', damage: '1d8+5', broken: false, weight: 4, notes: '', material: 'obsidian' },
                { id: 'eq-2', name: 'Bone Dagger', type: 'weapon', damage: '1d4+5', broken: false, weight: 1, notes: 'Concealed', material: 'bone' },
                { id: 'eq-3', name: 'Chitin Breastplate', type: 'armor', armorBonus: 5, broken: false, weight: 15, notes: '-3 ACP', material: 'chitin' },
                { id: 'eq-4', name: 'Bone Shield (Light)', type: 'shield', armorBonus: 1, broken: true, weight: 3, notes: 'Cracked from arena fight', material: 'bone' },
                { id: 'eq-5', name: 'Waterskin', type: 'gear', broken: false, weight: 4, notes: 'Half full', material: 'leather' },
                { id: 'eq-6', name: 'Rope (hemp, 50ft)', type: 'gear', broken: false, weight: 10, notes: '', material: 'hemp' },
            ]),
            notes: 'Former gladiator slave of Tyr. Freed during the revolution. Fights with a chipped obsidian longsword that he refuses to replace — it was the first weapon he ever won in the arena.\n\nGoals:\n- Find the hidden oasis rumored to exist beneath the Ringing Mountains\n- Settle the score with Kalak\'s remaining templars',
            userId: player.id,
            campaignId: campaign.id,
        },
    });
    console.log(`  Character: ${rikus.name} (${rikus.race} ${rikus.classLevel})`);

    console.log('\n✅ Seed complete!\n');
    console.log('To join as GM:');
    console.log('  Campaign: "The Wanderer\'s Chronicle"');
    console.log('  Password: "athas"');
    console.log('  Username: "The Wanderer"');
    console.log('  Role: GM');
    console.log('\nTo join as Player:');
    console.log('  Campaign: "The Wanderer\'s Chronicle"');
    console.log('  Password: "athas"');
    console.log('  Username: "Rikus"');
    console.log('  Role: Player');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
