import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { sessionMiddleware, AuthenticatedRequest } from '../middleware/session';
import { logger } from '../logger';

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, config.uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    },
});

const router = Router();

router.use(sessionMiddleware);

/**
 * GET /api/uploads
 * Lists all uploaded images.
 */
router.get('/', (_req: AuthenticatedRequest, res: Response): void => {
    const uploadsDir = path.resolve(config.uploadDir);

    try {
        if (!fs.existsSync(uploadsDir)) {
            res.json([]);
            return;
        }

        const files: string[] = fs.readdirSync(uploadsDir);
        const imageExtensions = /\.(jpeg|jpg|png|gif|webp)$/i;
        const images = files
            .filter((f: string) => imageExtensions.test(f))
            .map((f: string) => ({
                filename: f,
                url: `/uploads/${f}`,
            }));

        res.json(images);
    } catch (err) {
        logger.error({ err }, '[Uploads] List error');
        res.status(500).json({ error: 'Failed to list uploads' });
    }
});

/**
 * POST /api/uploads
 * Upload a map image or token image.
 * Returns the URL path to the uploaded file.
 */
router.post('/', upload.single('file'), (req: Request, res: Response): void => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ url: fileUrl, filename: req.file.filename });
});

// ── Multer Error Handler ─────────────────────────────────────────
// Must be defined after the upload route to catch multer-specific errors.
router.use((err: Error, _req: Request, res: Response, next: Function): void => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors (file too large, too many files, etc.)
        res.status(400).json({ error: err.message });
        return;
    }
    if (err.message && err.message.includes('Only image files are allowed')) {
        // Custom file filter rejection
        res.status(400).json({ error: err.message });
        return;
    }
    next(err);
});

export default router;
