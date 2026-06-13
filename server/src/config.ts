import path from 'path';

/**
 * Parse CLIENT_ORIGIN env var.
 * Supports: single origin, comma-separated origins, or '*' (allow all).
 * Defaults to '*' in development, 'http://localhost:3001' in production.
 */
function parseClientOrigin(): string | string[] {
    const raw = process.env.CLIENT_ORIGIN;
    if (!raw) {
        return process.env.NODE_ENV === 'production' ? 'http://localhost:3001' : '*';
    }
    if (raw === '*') return '*';
    const origins = raw.split(',').map(o => o.trim()).filter(Boolean);
    return origins.length === 1 ? origins[0] : origins;
}

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    clientOrigin: parseClientOrigin(),
    uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
};
