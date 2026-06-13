/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    // Server URL is dynamic (set at runtime via lobby), so we can't
    // predict remote image hosts at build time. Disable Next.js image
    // optimization — appropriate for a VTT with user-uploaded maps.
    images: {
        unoptimized: true,
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
