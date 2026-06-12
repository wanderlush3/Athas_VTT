import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger';
import {
    CompendiumPsionic,
    CompendiumEquipment,
    CompendiumSpell,
    CompendiumFeat,
    RaceData,
    ClassData,
} from 'athas-shared';

const router = Router();

// ── Load compendium data once at startup ─────────────────────────
const DATA_DIR = path.resolve(__dirname, '../../data/compendium');

function loadJson<T>(filename: string): T[] {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as T[];
    } catch (err) {
        logger.error({ err, filename }, '[Compendium] Failed to load data file');
        return [];
    }
}

const psionics: CompendiumPsionic[] = loadJson<CompendiumPsionic>('psionics.json');
const equipment: CompendiumEquipment[] = loadJson<CompendiumEquipment>('equipment.json');
const spells: CompendiumSpell[] = loadJson<CompendiumSpell>('spells.json');
const feats: CompendiumFeat[] = loadJson<CompendiumFeat>('feats.json');
const races: RaceData[] = loadJson<RaceData>('races.json');
const classes: ClassData[] = loadJson<ClassData>('classes.json');

logger.info(`[Compendium] Loaded: ${psionics.length} psionics, ${equipment.length} equipment, ${spells.length} spells, ${feats.length} feats, ${races.length} races, ${classes.length} classes`);

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// ── Helper: case-insensitive substring match ─────────────────────
function matchesQuery(value: string, query: string): boolean {
    return value.toLowerCase().includes(query.toLowerCase());
}

// ── Helper: paginate results ─────────────────────────────────────
function paginate<T>(results: T[], req: Request) {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize as string, 10) || DEFAULT_PAGE_SIZE));
    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return {
        results: results.slice(start, start + pageSize),
        total,
        page,
        pageSize,
        totalPages,
    };
}

// ── Psionics ─────────────────────────────────────────────────────

/**
 * GET /api/compendium/psionics
 * Query params: q (name search), class, level, discipline, page, pageSize
 */
router.get('/psionics', (req: Request, res: Response): void => {
    let results = [...psionics];
    const { q, class: cls, level, discipline } = req.query;

    if (q && typeof q === 'string') {
        results = results.filter(p => matchesQuery(p.name, q));
    }
    if (cls && typeof cls === 'string') {
        results = results.filter(p => p.classes.some((c: string) => c.toLowerCase() === cls.toLowerCase()));
    }
    if (level !== undefined && level !== '') {
        const lvl = parseInt(level as string, 10);
        if (!isNaN(lvl)) {
            results = results.filter(p => p.level <= lvl);
        }
    }
    if (discipline && typeof discipline === 'string') {
        results = results.filter(p => p.discipline.toLowerCase() === discipline.toLowerCase());
    }

    res.json(paginate(results, req));
});

/**
 * GET /api/compendium/psionics/:id
 */
router.get('/psionics/:id', (req: Request, res: Response): void => {
    const entry = psionics.find(p => p.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Psionic power not found' });
        return;
    }
    res.json(entry);
});

// ── Equipment ────────────────────────────────────────────────────

/**
 * GET /api/compendium/equipment
 * Query params: q (name search), type, material, page, pageSize
 */
router.get('/equipment', (req: Request, res: Response): void => {
    let results = [...equipment];
    const { q, type, material } = req.query;

    if (q && typeof q === 'string') {
        results = results.filter(e => matchesQuery(e.name, q));
    }
    if (type && typeof type === 'string') {
        results = results.filter(e => e.type.toLowerCase() === type.toLowerCase());
    }
    if (material && typeof material === 'string') {
        results = results.filter(e => e.material.toLowerCase() === material.toLowerCase());
    }

    res.json(paginate(results, req));
});

/**
 * GET /api/compendium/equipment/:id
 */
router.get('/equipment/:id', (req: Request, res: Response): void => {
    const entry = equipment.find(e => e.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Equipment not found' });
        return;
    }
    res.json(entry);
});

// ── Spells ───────────────────────────────────────────────────────

/**
 * GET /api/compendium/spells
 * Query params: q (name search), class, level, school, domain, page, pageSize
 */
router.get('/spells', (req: Request, res: Response): void => {
    let results = [...spells];
    const { q, class: cls, level, school, domain } = req.query;

    if (q && typeof q === 'string') {
        results = results.filter(s => matchesQuery(s.name, q));
    }
    if (cls && typeof cls === 'string') {
        results = results.filter(s => s.classes.some((c: string) => c.toLowerCase() === cls.toLowerCase()));
    }
    if (level !== undefined && level !== '') {
        const lvl = parseInt(level as string, 10);
        if (!isNaN(lvl)) {
            results = results.filter(s => s.level <= lvl);
        }
    }
    if (school && typeof school === 'string') {
        results = results.filter(s => s.school.toLowerCase() === school.toLowerCase());
    }
    if (domain && typeof domain === 'string') {
        results = results.filter(s => s.domains && s.domains.some((d: string) => d.toLowerCase() === domain.toLowerCase()));
    }

    res.json(paginate(results, req));
});

/**
 * GET /api/compendium/spells/:id
 */
router.get('/spells/:id', (req: Request, res: Response): void => {
    const entry = spells.find(s => s.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Spell not found' });
        return;
    }
    res.json(entry);
});

// ── Feats ────────────────────────────────────────────────────────

/**
 * GET /api/compendium/feats
 * Query params: q (name search), type, page, pageSize
 */
router.get('/feats', (req: Request, res: Response): void => {
    let results = [...feats];
    const { q, type } = req.query;

    if (q && typeof q === 'string') {
        results = results.filter(f => matchesQuery(f.name, q));
    }
    if (type && typeof type === 'string') {
        results = results.filter(f => f.type.toLowerCase() === type.toLowerCase());
    }

    res.json(paginate(results, req));
});

/**
 * GET /api/compendium/feats/:id
 */
router.get('/feats/:id', (req: Request, res: Response): void => {
    const entry = feats.find(f => f.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Feat not found' });
        return;
    }
    res.json(entry);
});

// ── Races ────────────────────────────────────────────────────────────

/**
 * GET /api/compendium/races
 */
router.get('/races', (_req: Request, res: Response): void => {
    res.json(races);
});

/**
 * GET /api/compendium/races/:id
 */
router.get('/races/:id', (req: Request, res: Response): void => {
    const entry = races.find(r => r.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Race not found' });
        return;
    }
    res.json(entry);
});

// ── Classes ──────────────────────────────────────────────────────────

/**
 * GET /api/compendium/classes
 */
router.get('/classes', (_req: Request, res: Response): void => {
    res.json(classes);
});

/**
 * GET /api/compendium/classes/:id
 */
router.get('/classes/:id', (req: Request, res: Response): void => {
    const entry = classes.find(c => c.id === req.params.id);
    if (!entry) {
        res.status(404).json({ error: 'Class not found' });
        return;
    }
    res.json(entry);
});

export default router;
