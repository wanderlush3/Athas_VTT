import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
    weight: ['300', '400', '500', '600'],
});

const cinzel = Cinzel({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-cinzel',
    weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
    title: 'Athas VTT — Dark Sun Virtual Tabletop',
    description: 'A self-hosted virtual tabletop for D&D 3.5e Dark Sun campaigns. The Scorched World awaits.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${cinzel.variable}`}>
            <body className="min-h-screen bg-desert-gradient">
                {children}
            </body>
        </html>
    );
}
