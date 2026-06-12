export default function GameLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-obsidian-950">
            {children}
        </div>
    );
}
