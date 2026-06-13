# ⚔️ Athas VTT — Dark Sun Virtual Tabletop

A self-hosted, web-based Virtual Tabletop purpose-built for **D&D 3.5e Dark Sun** campaigns. Real-time multiplayer with full character sheet automation, psionic power tracking, and Athasian survival mechanics.

> *"Under the crimson sun, the sands await..."*

**Design Philosophy:** Digital tabletop, not video game — manual GM control, clean UI, Athasian flavor baked into every system.

---

## ✨ Features

### 🗺️ Tactical Map
- Upload custom maps with drag-and-drop token placement
- **Fog of War** — GM-controlled brush tool to reveal/hide map regions
- **Defiling Overlay** — Scorched earth zones visualizing arcane defiler magic
- Keyboard shortcuts: `V` Select, `F` Fog Brush, `D` Defile, `T` Add Token

### 📜 Character Sheets
- Full **D&D 3.5e** stat block with auto-calculated modifiers
- **Multiclass support** — track multiple class levels with per-class BAB, saves, and hit dice
- **AC breakdown** — armor, shield, DEX, size, natural, deflection components
- Melee/ranged attack bonus split, grapple modifier, touch & flat-footed AC
- **Level-Up Wizard** — step-by-step guided leveling with undo support
- **20 D&D 3.5e conditions** with automatic stat penalty application
- Description fields with Athas-specific options (elements for Clerics, Sorcerer-Kings for Templars)

### 🔮 Psionics
- **217 psionic powers** across 6 disciplines (Clairsentience, Metapsionics, Psychokinesis, Psychometabolism, Psychoportation, Telepathy)
- PSP (Psionic Strength Points) tracking with visual bar
- Every character receives a **random wild talent** at creation
- **43 psionic items** (artifacts, dorjes, power stones, psicrowns) that auto-grant powers on equip

### 🏜️ Dark Sun Survival Mechanics
- **Weapon Breakage** — Non-metal weapons roll breakage checks (obsidian DC 3, bone DC 2, etc.), auto-mark broken on failure
- **Water & Thirst** — Per-race water requirements, 4-stage dehydration progression
- **Heat & Sun Sickness** — Terrain-based check frequency, racial CON modifiers, 4-stage sun sickness
- **Forced March** — Travel distance calculator with terrain speed multipliers, fatigue staging
- **Natural Healing** — Desert conditions halve healing without adequate water and shade
- **Metal Scarcity** — "Forge in Metal" toggle with ×100 cost multiplier, gold-styled metal indicators

### 📚 Compendium
- **Psionics** (217 entries), **Spells** (147 KB), **Feats** (72 KB), **Equipment** (203 KB)
- **11 Dark Sun races** with ability adjustments, racial traits, and water requirements
- **11 Dark Sun classes** with full progression tables
- Paginated search with filters (school, class, discipline, material, type)
- **Prerequisite enforcement** — ability scores, feats, BAB, class levels validated before adding
- 🔓 GM Override to force-add despite unmet prerequisites

### 🎲 Dice & Chat
- Visual dice tray with shared roll log
- Real-time chat with auto-scroll and "New messages ↓" indicator
- Roll results broadcast to all players

### 🛡️ GM Tools
- **GM Toolbar** — Map upload, token management, fog & defile brushes
- **Player Sheet Viewer** — Inspect any player's character in real-time
- **Survival Dashboard** — Party-wide survival status at a glance (💧 water, 🔥 heat, 🥾 march, ⚔️ gear)
- **Metal flag** — Amber badge on characters carrying metal equipment

### 🔒 Security
- Password-protected campaigns with bcrypt hashing
- Session tokens with 21-day expiry and auto-refresh
- Field whitelists preventing mass assignment
- Input validation (Zod) on all REST and Socket endpoints
- Rate limiting on auth (20 req/15 min), Helmet security headers
- Upload restrictions (JPEG, PNG, GIF, WebP only — no SVG)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **npm** 9+

### Install & Run

```bash
# Clone the repository
git clone https://github.com/wanderlush3/Athas_VTT.git
cd Athas_VTT

# Install all dependencies (monorepo workspaces)
npm install

# Initialize the database
npm run db:migrate

# (Optional) Seed with demo data
npm run db:seed

# Start both server and client
npm run dev
```

The server startup banner shows your network address:

```
⚔️  ATHAS VTT SERVER ⚔️
  Local:   http://localhost:3000
  Network: http://192.168.1.42:3000
→ Share this with players: http://192.168.1.42:3000
```

- **Server:** http://localhost:3000
- **Client:** http://localhost:3001

### Joining a Game

1. Open http://localhost:3001
2. *(Remote play only)* Click **⚙ Server Connection** and enter the server address (e.g., `192.168.1.42:3000`)
3. Wait for the 🟢 **Connected** indicator
4. Enter a **Campaign Name** and **Password** — if the campaign doesn't exist, it's created automatically
5. Enter your **Player Name** and choose your **Role** (Player or Game Master)
6. Click **Enter Campaign**

No account registration required — campaigns are created and joined implicitly. The server address persists in your browser, so returning players reconnect automatically.

---

## 🌐 Remote Play

Athas VTT supports remote multiplayer — the GM hosts the server, and players connect from anywhere on the local network or internet.

### Setup (GM / Host)

1. Start the server with `npm run dev` — the startup banner displays your shareable network address
2. Ensure port `3000` is accessible (open firewall / port-forward if needed for internet play)
3. Share the **Network** address with your players

### Connecting (Players)

1. Clone the repo and run the client with `npm run dev` (or use `start_client.bat`)
2. In the lobby, expand **⚙ Server Connection**
3. Paste the GM's server address → wait for 🟢 **Connected**
4. Join the campaign as usual

### Configuration

The server defaults to allowing all client origins (`CORS: *`) in development mode. For production / internet-facing servers:

```bash
# server/.env — restrict CORS to specific origins
CLIENT_ORIGIN=http://192.168.1.50:3001,http://player2.example.com:3001
```

Players can also pre-configure the server URL via environment variable instead of the lobby UI:

```bash
# client/.env — build-time default (lobby UI overrides this at runtime)
NEXT_PUBLIC_SERVER_URL=http://192.168.1.42:3000
```

---

## ⚙️ Configuration

Copy `server/.env.example` to `server/.env` and customize:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:../../prisma/athas.db` | SQLite database path |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | Bind address (`0.0.0.0` = all interfaces) |
| `CLIENT_ORIGIN` | `*` (dev) / `http://localhost:3001` (prod) | CORS origin(s) — single, comma-separated, or `*` |
| `NODE_ENV` | `development` | Environment mode |
| `UPLOAD_DIR` | `./uploads` | Map/token upload directory |
| `LOG_LEVEL` | `debug` | Pino log level (trace/debug/info/warn/error/fatal) |

Client environment variables (optional — lobby UI is preferred for runtime config):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` | Server URL (build-time default) |
| `NEXT_PUBLIC_API_URL` | *(derived from server URL)* | API endpoint override |

---

## 🏗️ Architecture

```
athas-vtt/
├── client/          Next.js 14 (App Router)         :3001
├── server/          Express + Socket.io + Prisma     :3000
└── shared/          TypeScript types, enums, game constants
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Map Rendering** | Konva / react-konva (HTML5 Canvas) |
| **State Management** | Zustand + custom hooks |
| **Backend** | Express 4, Socket.io 4, TypeScript |
| **Database** | SQLite via Prisma ORM |
| **Validation** | Zod schemas on all endpoints |
| **Security** | Helmet, bcrypt, express-rate-limit |
| **Logging** | Pino + pino-http (structured JSON in production) |
| **Testing** | Vitest (243 unit tests) |

### Data Model

| Model | Purpose |
|---|---|
| **Campaign** | Game session — map state, fog mask, defile zones, token positions |
| **User** | Session-scoped player/GM identity with token-based auth |
| **Character** | Full D&D 3.5e character sheet with Dark Sun extensions |
| **ChatMessage** | Chat messages and dice roll results |

### Real-Time Communication

All game state syncs via **Socket.io** WebSocket events (defined in `shared/src/socketEvents.ts`):
- Campaign state, token movement, fog reveals, defile placement
- Character sheet updates, power usage, dice rolls
- Chat messages, user join/leave notifications

---

## 📁 Project Structure

```
client/src/
├── app/
│   ├── page.tsx                     # Lobby — campaign join/create
│   ├── game/
│   │   ├── page.tsx                 # Game session — 3-column layout
│   │   └── components/
│   │       ├── MapCanvas.tsx        # Konva tactical map
│   │       ├── TokenLayer.tsx       # Map token rendering
│   │       ├── FogOfWar.tsx         # Fog-of-war overlay
│   │       ├── DefileOverlay.tsx    # Defiler scorched earth zones
│   │       ├── GMToolbar.tsx        # GM map/fog/token tools
│   │       ├── CharacterSheet.tsx   # Character sheet container
│   │       ├── CharacterCreateDialog.tsx
│   │       ├── StatsTab.tsx         # Stats, combat, saves
│   │       ├── SkillsTab.tsx        # 42 skills with modifiers
│   │       ├── SpellsTab.tsx        # Spell management
│   │       ├── PowersTab.tsx        # Psionic powers
│   │       ├── EquipmentTab.tsx     # Inventory with breakage
│   │       ├── SurvivalTab.tsx      # Water, heat, march, healing
│   │       ├── NotesTab.tsx         # Character notes
│   │       ├── ConditionsBar.tsx    # Condition toggles
│   │       ├── LevelUpWizard.tsx    # Step-by-step level-up
│   │       ├── CompendiumSearch.tsx # Searchable compendium browser
│   │       ├── ChatLog.tsx          # Chat with auto-scroll
│   │       ├── DiceTray.tsx         # Dice roller
│   │       ├── PlayerSheetViewer.tsx # GM view of player sheets
│   │       ├── GMSurvivalDashboard.tsx # Party survival overview
│   │       └── DeleteConfirmDialog.tsx
│   └── globals.css                  # Design system
├── hooks/
│   ├── useSocket.ts                 # Typed Socket.io wrapper
│   ├── useCharacter.ts              # Character state management
│   ├── useGameState.ts              # Global game state (Zustand)
│   ├── useSyncField.ts              # Field sync helper
│   └── useModal.ts                  # Focus trap & accessibility
└── lib/
    ├── api.ts                       # Typed HTTP client
    └── socket.ts                    # Socket.io connection

server/src/
├── index.ts                         # Express + Socket.io setup
├── config.ts                        # Environment configuration
├── logger.ts                        # Pino structured logging
├── middleware/session.ts            # Session token middleware
├── routes/
│   ├── auth.ts                      # Join/create campaign
│   ├── campaigns.ts                 # Campaign CRUD
│   ├── characters.ts                # Character CRUD
│   ├── compendium.ts                # Compendium search API
│   └── uploads.ts                   # File upload (maps, tokens)
├── socket/
│   ├── index.ts                     # Socket.io initialization
│   ├── chatEvents.ts                # Chat & dice roll events
│   ├── mapEvents.ts                 # Map, fog, token, defile events
│   ├── sheetEvents.ts               # Character sheet sync events
│   ├── guards.ts                    # Socket auth guards
│   └── helpers.ts                   # JSON field update utility
├── validation/schemas.ts            # Zod schemas for all inputs
└── prisma/
    ├── schema.prisma                # Database schema
    ├── seed.ts                      # Demo data seeder
    └── migrations/                  # Migration history

shared/src/
├── index.ts                         # Package exports
├── enums.ts                         # Races, classes, disciplines, alignments
├── types.ts                         # 22 interfaces + 7 type definitions
├── gameConstants.ts                 # XP tables, carry capacity, breakage, healing, etc.
├── skills.ts                        # Skill calculations
├── socketEvents.ts                  # Typed socket event constants
└── __tests__/                       # 243 Vitest unit tests
    ├── gameConstants.test.ts
    ├── prerequisites.test.ts
    └── skills.test.ts
```

---

## 📚 Compendium API

All endpoints return paginated results (default 50, max 100):

```json
{ "results": [...], "total": 217, "page": 1, "pageSize": 50, "totalPages": 5 }
```

| Endpoint | Filters |
|---|---|
| `GET /api/compendium/psionics` | `q`, `class`, `level`, `discipline` |
| `GET /api/compendium/spells` | `q`, `class`, `level`, `school`, `domain` |
| `GET /api/compendium/feats` | `q`, `type` |
| `GET /api/compendium/equipment` | `q`, `type`, `material` |
| `GET /api/compendium/races` | — (returns all) |
| `GET /api/compendium/classes` | — (returns all) |

Each category also supports `GET /api/compendium/{category}/:id` for single-entry lookup.

---

## 🧪 Testing

```bash
# Run all unit tests (shared package)
npm -w shared run test
```

**243 tests** across 3 suites:
- **Game Constants** (81) — XP tables, carrying capacity, multiclass math, size modifiers, breakage DCs, water requirements, heat/march mechanics, natural healing
- **Prerequisites** (28) — Feat prerequisite validation, spell eligibility checking
- **Skills** (16) — Skill modifier calculations, class/cross-class rank limits
- **Conditions** (41) — Condition penalty aggregation, stat modifier stacking
- **Heat & March** (54) — Sun sickness progression, forced march fatigue, terrain modifiers
- **Metal Scarcity** (11) — Metal upgrade cost calculation
- **Natural Healing** (12) — Desert healing modifier validation

---

## 🎨 Visual Design

Built with a custom **Athasian color palette**:

| Token | Color | Usage |
|---|---|---|
| **Sand** | `#c4943a` – `#fdf8f0` | Primary accent, text, buttons |
| **Obsidian** | `#1a1715` – `#f4f3f2` | Backgrounds, surfaces, borders |
| **Crimson** | `#8b1a1a` | Danger actions, GM role badge |
| **Silt** | `#c4a882` | Secondary accent |
| **Bone** | `#e8dcc8` | Tertiary accent |

**Typography:** Cinzel (display/headings) + Inter (body text)

---

## 📄 License

This project is for personal use. Dark Sun is a trademark of Wizards of the Coast.
