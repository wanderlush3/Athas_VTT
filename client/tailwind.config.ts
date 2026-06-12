import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Athasian palette — scorched desert tones
                sand: {
                    50: '#fdf8f0',
                    100: '#f9ecd8',
                    200: '#f2d5ab',
                    300: '#e9b974',
                    400: '#df9a3e',
                    500: '#d47f1e',
                    600: '#b86316',
                    700: '#984a15',
                    800: '#7c3b18',
                    900: '#673217',
                },
                obsidian: {
                    50: '#f4f3f2',
                    100: '#e3e1de',
                    200: '#c9c4be',
                    300: '#aaa298',
                    400: '#928678',
                    500: '#847664',
                    600: '#716354',
                    700: '#5c5046',
                    800: '#4e443e',
                    900: '#2d2824',
                    950: '#1a1715',
                },
                crimson: {
                    DEFAULT: '#8b1a1a',
                    light: '#b22222',
                    dark: '#5c1010',
                },
                silt: '#c4a882',
                bone: '#e8dcc8',
            },
            fontFamily: {
                display: ['var(--font-cinzel)', 'Cinzel', 'serif'],
                body: ['var(--font-inter)', 'Inter', 'sans-serif'],
            },
            backgroundImage: {
                'desert-gradient': 'linear-gradient(135deg, #2d2824 0%, #4e443e 50%, #673217 100%)',
            },
        },
    },
    plugins: [],
};

export default config;
