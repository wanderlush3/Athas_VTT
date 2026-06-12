/** @type {import('next').NextConfig} */

// Parse server URL for image remote patterns
const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
const parsed = new URL(serverUrl);

const nextConfig = {
    reactStrictMode: true,
    // Allow images from the server
    images: {
        remotePatterns: [
            {
                protocol: parsed.protocol.replace(':', ''),
                hostname: parsed.hostname,
                port: parsed.port || '',
                pathname: '/uploads/**',
            },
        ],
    },
    // Fix React-Konva SSR: externalize 'canvas' module for server-side
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals = [...(config.externals || []), 'canvas'];
        }
        return config;
    },
};

export default nextConfig;

