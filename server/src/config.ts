import path from 'path';

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3001',
    uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
};
