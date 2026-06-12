import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './logger';
import { prisma } from './prisma/client';
import { initializeSocket } from './socket';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import campaignRoutes from './routes/campaigns';
import uploadRoutes from './routes/uploads';
import compendiumRoutes from './routes/compendium';

// ── Express App ──────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

// Ensure uploads directory exists
const uploadsPath = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(uploadsPath));

// ── Rate Limiting ────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── REST Routes ──────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/compendium', compendiumRoutes);

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        server: 'Athas VTT',
        version: '0.1.0',
        uptime: process.uptime(),
    });
});

// ── Socket.io ────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
    cors: {
        origin: config.clientOrigin,
        methods: ['GET', 'POST'],
    },
});

initializeSocket(io);

// ── Start Server ─────────────────────────────────────────────────
server.listen(config.port, () => {
    logger.info('');
    logger.info('  ╔══════════════════════════════════════════╗');
    logger.info('  ║         ⚔️  ATHAS VTT SERVER ⚔️          ║');
    logger.info('  ║     The Scorched World Awaits...         ║');
    logger.info('  ╠══════════════════════════════════════════╣');
    logger.info(`  ║  HTTP:   http://localhost:${config.port}           ║`);
    logger.info(`  ║  Socket: ws://localhost:${config.port}             ║`);
    logger.info('  ╚══════════════════════════════════════════╝');
    logger.info('');
});

// ── Graceful Shutdown ────────────────────────────────────────────
function shutdown(signal: string) {
    logger.info({ signal }, 'Received shutdown signal, closing gracefully...');

    // Force exit after 10 seconds if graceful shutdown hangs
    const forceTimer = setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
    }, 10_000);
    forceTimer.unref();

    io.close(() => {
        logger.info('Socket.io server closed');
        server.close(async () => {
            logger.info('HTTP server closed');
            await prisma.$disconnect();
            logger.info('Prisma client disconnected');
            clearTimeout(forceTimer);
            process.exit(0);
        });
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, io, server };
