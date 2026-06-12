# ⚔️ Athas VTT — Dark Sun Virtual Tabletop

A self-hosted, web-based Virtual Tabletop built for **D&D 3.5e Dark Sun** campaigns.

> *"Digital Tabletop, not Video Game"* — Manual control, clean UI, Athasian flavor.

## Quick Start

```bash
# Install all dependencies
npm install

# Initialize the database
npm run db:migrate

# Start both server and client
npm run dev
```

- **Server:** http://localhost:3000
- **Client:** http://localhost:3001

## Architecture

| Package   | Tech                        | Port |
|-----------|-----------------------------|------|
| `server`  | Express + Socket.io + Prisma | 3000 |
| `client`  | Next.js 14 (App Router)     | 3001 |
| `shared`  | TypeScript types & constants | —    |

## Features

- 🗺️ **Map Canvas** — Upload maps, drag tokens, fog of war
- 🔥 **Defiling Overlay** — Scorched earth zones for Athasian arcane magic
- 🎲 **Dice Tray** — Visual dice picker with shared roll log
- 📜 **Character Sheets** — 3.5e stats, psionics (PSP), equipment with breakage
- 🔄 **Real-time Sync** — All state synced via Socket.io
