# Athas VTT — Backlog

> Project task tracking for the Athas Virtual Tabletop.
> Updated: 2026-06-09

---

## Compendium Data Population

Populate the `server/data/compendium/` JSON files with comprehensive game data extracted from source PDFs.

### ✅ Psionics — COMPLETE
- **Source PDFs:** The Complete Psionics Handbook, The Will and the Way, Expanded Psionics Handbook
- **Result:** 217 unique powers across 6 disciplines
- **File:** `server/data/compendium/psionics.json` (631 KB)
- **Breakdown:**
  - Clairsentience: 29 | Psychokinesis: 31 | Psychometabolism: 42
  - Psychoportation: 29 | Telepathy: 59 | Metapsionics: 27
- **Notes:** 2e powers adapted to 3.5e-style JSON schema. Dark Sun flavor notes added. Discipline dropdown updated (`Metacreativity` → `Metapsionics`).

### ✅ Spells — COMPLETE
- **Source PDFs:** Player's Handbook 3.5, Defilers and Preservers, Earth Air Fire and Water
- **File:** `server/data/compendium/spells.json` (147 KB)
- **Schema:** `{ id, name, level, school, subschool, classes, components, castingTime, range, target, duration, savingThrow, spellResistance, description, defilingRadius, darkSunNotes }`
- **Filter types available:** school, class (Cleric, Druid, Defiler, Preserver, Templar), domain

### ✅ Feats — COMPLETE
- **Source PDFs:** Player's Handbook 3.5
- **File:** `server/data/compendium/feats.json` (72 KB)
- **Schema:** `{ id, name, type, prerequisites, benefit, special, description, classes, darkSunNotes }`
- **Filter types available:** general, psionic, regional, metamagic, item creation

### ✅ Equipment — COMPLETE
- **Source PDFs:** Player's Handbook 3.5
- **File:** `server/data/compendium/equipment.json` (203 KB)
- **Schema:** `{ id, name, type, subtype, material, cost, weight, damage, damageType, critical, armorBonus, maxDexBonus, armorCheckPenalty, proficiency, range, breakageNote, properties, description, darkSunNotes }`
- **Filter types available:** type (weapon/armor/shield/gear), material (obsidian/bone/wood/stone/chitin/metal/hide)

---

## ✅ Compendium Search — Pagination — COMPLETE

- Server returns `{ results, total, page, pageSize, totalPages }` envelope instead of bare arrays.
- Client shows result count, page indicator, and ◀ Prev / Next ▶ buttons.
- Default page size: 50. Max page size: 100.
- Page resets to 1 on new search query or filter change.

---

## ✅ Tier 1 — Character Creation Core — COMPLETE

### ✅ Skills UI
- Full 3.5e skill list (42 skills) with ability mod associations on Skills tab
- Auto-calculate skill modifier (ranks + ability mod)
- Class skill vs cross-class toggle with visual distinction
- Shared `SKILLS_3_5E` constant in `athas-shared` package

### ✅ Racial Data & Auto-Adjustments
- `server/data/compendium/races.json` — all 11 Dark Sun races
- Ability adjustments, speed, size, racial traits, languages, favored class
- Auto-apply racial ability adjustments and speed in creation dialog
- Racial traits summary panel in creation dialog

### ✅ Class Data & Auto-Calculations
- `server/data/compendium/classes.json` — all 11 Dark Sun classes
- Hit die, BAB progression, save progression, skill points per level, class skill list
- Auto-calculate HP (hitDie + CON mod), BAB, saves on creation

---

## ✅ Tier 2 — Quality of Life — COMPLETE

### ✅ Ability Score Roller
- 4d6-drop-lowest dice roller in character creation dialog
- Animated dice display (15 ticks at 100ms, then final results)
- Dropped die shown in red with line-through
- Individual re-roll buttons per ability score
- **File:** `CharacterSheet.tsx` — `CharacterCreateDialog` section

### ✅ Currency Tracker
- Prisma fields: `currencyCp`, `currencySp`, `currencyGp`, `currencyBits`
- Currency panel on Stats tab: Ceramic 🏺, Silver 🥈, Gold 🥇, Bits ⚙️
- Editable numeric inputs, real-time save via socket
- **Files:** `schema.prisma`, `sheetEvents.ts`, `useCharacter.ts`, `CharacterSheet.tsx`

### ✅ XP Tracker
- Prisma field: `experiencePoints`
- **Dark Sun class-specific XP tables** (7 class groups: warrior, ranger, rogue, priest, defiler, preserver, psionicist)
- Defilers advance ~30% faster than Preservers
- Amber XP progress bar in character header, click-to-edit
- Pulsing ⬆ Level Up indicator when XP threshold reached
- **File:** `shared/src/gameConstants.ts` — `XP_TABLES`, `CLASS_XP_GROUP`, helpers

### ✅ Encumbrance / Carrying Capacity
- Auto-calculate total weight from equipment + coins (50 coins = 1 lb)
- D&D 3.5e carry capacity table (STR 1–30)
- Color-coded progress bar: emerald (light) → yellow (medium) → orange (heavy) → red+pulse (overloaded)
- Load thresholds shown below bar
- **File:** `shared/src/gameConstants.ts` — `getCarryCapacity()`, `getLoadCategory()`

### ✅ Wild Talent Roller
- Random psionic wild talent generator in character creation dialog
- Fetches level-1 powers from compendium API
- Decelerating slot-machine animation (20 ticks, progressively slower)
- Selected talent shown with name, cost, discipline, description
- Auto-added to character's `powers` array on creation

---

## Tier 3 — Polish & Detail — NEARLY COMPLETE

### ✅ AC Breakdown — COMPLETE
- Decompose Armor Class into components: armor + shield + DEX + size + natural + deflection
- Show each modifier source on the Stats tab
- Touch AC and flat-footed AC computed
- **Fields:** `acArmor`, `acShield`, `acNatural`, `acDeflection` in schema

### ✅ Melee / Ranged Attack Bonus Split — COMPLETE
- Separate melee attack bonus (BAB + STR mod + size mod) from ranged (BAB + DEX mod + size mod)
- Display both on the Stats tab

### ✅ Description Fields — COMPLETE
- Character description fields: gender, deity/element/patron
- Athas-specific: Clerics choose an element (Air/Earth/Fire/Water), Templars serve a Sorcerer-King, Druids default to "The Land"
- Appearance and personality text fields on Notes tab

### ✅ Grapple Modifier — COMPLETE
- Compute and display grapple modifier (BAB + STR mod + grapple size mod)

### ✅ Condition Tracking — COMPLETE
- Track temporary conditions via `CONDITIONS_3_5E` shared constant
- `ConditionsBar` component with toggle buttons and active count
- JSON `conditions` field in schema

### ✅ Multiclass Support — COMPLETE
- Support multiple class levels (e.g., "Fighter 3 / Psionicist 2")
- Per-class BAB, saves, hit dice tracking
- Auto-computed derived stats when adding class levels
- XP penalty calculation for uneven levels (ignores favored class)
- Class breakdown panel on Stats tab with per-class contribution detail
- "Add Class Level" dialog for leveling into new or existing classes
- Backward-compatible with existing single-class characters
- **Files:** `gameConstants.ts` (shared helpers), `schema.prisma`, `CharacterSheet.tsx`, `useCharacter.ts`, `page.tsx`, `sheetEvents.ts`

### ✅ Psionic Item Integration — COMPLETE
- Items that grant psionic powers to non-psionicist characters
- Psionic Artifacts of Athas as a data source
- **Added:** `GrantedPower` interface, `grantedPowers` field on equipment, item-power auto-grant on equip/remove
- **Data:** 19 artifacts updated with grantedPowers, 10 dorjes, 8 power stones, 6 psicrowns added (43 psionic items total)
- **UI:** Equipment tab shows 🔮 psionic indicator, expandable granted powers detail; Powers tab groups item-granted powers by source with distinct styling
- **Files:** `enums.ts`, `equipment.json`, `CompendiumSearch.tsx`, `CharacterSheet.tsx`

---

### ✅ Feat & Spell Selection Prerequisite Enforcement — COMPLETE
- `StructuredPrereqs` interface + `structuredPrereqs` field on 66 feats (46 feats have "None" prerequisites)
- `checkFeatPrerequisites()` validates ability scores, feats, BAB, class levels, character level, caster level, skill ranks
- Un-checkable prerequisites (wild shape ability, weapon-specific feats, etc.) shown as ⚠️ amber warnings
- `checkSpellEligibility()` validates class spell list membership and max castable spell level
- CompendiumSearch: ✅/❌ per-requirement breakdown in detail panel, disabled Add button when prereqs unmet
- 🔓 GM Override toggle to force-add despite unmet prerequisites
- **Files:** `shared/src/enums.ts`, `shared/src/gameConstants.ts`, `server/data/compendium/feats.json`, `client/.../CompendiumSearch.tsx`, `client/.../CharacterSheet.tsx`

---

## ✅ Level Undo / History — COMPLETE

### ✅ Level-Up History Tracking
- `LevelUpRecord` interface captures every level-up: HP gained, skills spent, feat, ability boost, class features, and full prev-stats snapshot
- `levelHistory` JSON field on Character model stores the full stack
- History captured automatically in the Level-Up Wizard's `wizardApply()` function

### ✅ Undo Last Level-Up
- ⏪ Undo button in Class Breakdown section (only visible when history exists)
- Confirmation dialog shows exactly what will be reverted (HP, feat, skills, ability, features)
- LIFO reversal: restores derived stats from snapshot, removes feat/features/skills, decrements class level
- **Files:** `shared/src/enums.ts`, `server/src/prisma/schema.prisma`, `server/src/socket/sheetEvents.ts`, `client/src/hooks/useCharacter.ts`, `client/src/app/game/page.tsx`, `client/src/app/game/components/CharacterSheet.tsx`

---

## ✅ Phase 1 — Security Hardening — COMPLETE

### ✅ Password Hashing
- Campaign passwords hashed with bcrypt (12 rounds) on creation
- Password comparison uses `bcrypt.compare()` (constant-time)
- Seed script hashes demo password
- **Files:** `server/src/routes/auth.ts`, `server/src/prisma/seed.ts`

### ✅ Field Whitelists
- Campaign PATCH allows only `name` and `mapImageUrl` — all other fields rejected
- Character POST/PATCH uses `ALLOWED_CHARACTER_FIELDS` whitelist (30 fields) via `pickAllowedFields()` helper
- Prevents mass assignment of `id`, `userId`, `campaignId`, or any internal field
- **Files:** `server/src/routes/campaigns.ts`, `server/src/routes/characters.ts`

### ✅ Authorization Checks
- Character GET/:id, PATCH/:id, DELETE/:id scoped to user's campaign (`campaignId` filter)
- Players can only update/delete their own characters; GMs can modify any in their campaign
- Campaign GET/:id restricted to user's own campaign (membership check)
- **Files:** `server/src/routes/characters.ts`, `server/src/routes/campaigns.ts`

### ✅ Upload Security
- SVG removed from allowed upload types (only jpeg, jpg, png, gif, webp)
- `X-Content-Type-Options: nosniff` header set on all served uploads
- Fixed `require('fs')` inside handler → top-level `import`
- Fixed `sessionMiddleware as any` type cast → proper typing
- **Files:** `server/src/routes/uploads.ts`, `server/src/index.ts`

### ✅ Rate Limiting
- `express-rate-limit` on auth routes: 20 requests per 15-minute window
- Explicit `express.json({ limit: '1mb' })` body size limit
- **Files:** `server/src/index.ts`

### ✅ Session Expiration
- `expiresAt` field added to User model (Prisma migration)
- 21-day session duration on new user creation
- Session expiry refreshed on re-login (existing user re-joining)
- Session middleware rejects expired tokens with 401
- Client `api.ts` auto-redirects to lobby on 401 (clears localStorage)
- **Files:** `schema.prisma`, `session.ts`, `auth.ts`, `client/src/lib/api.ts`

---

## Campaign & Gameplay Notes

- **Psionics access:** On Athas, every character receives 1 random wild talent at creation. Only Psionicist-class characters gain full discipline access and level-based power progression. Non-psionicists can only gain additional powers via magical items.
- **Compendium level filter:** Powers/spells are auto-filtered by character level (`<= characterLevel`). As characters level up, higher-tier content becomes visible.

---

## ✅ Phase 2 — CharacterSheet Decomposition — COMPLETE

Broke apart `CharacterSheet.tsx` (originally 3,265 lines) into focused, typed components.

### ✅ Extract Tab Components to Separate Files
- `StatsTab.tsx`, `CharacterCreateDialog.tsx`, `SpellsTab.tsx`, `EquipmentTab.tsx`, `SkillsTab.tsx`, `PowersTab.tsx`, `ConditionsBar.tsx`, `DeleteConfirmDialog.tsx`, `NotesTab.tsx`
- **Files:** `client/src/app/game/components/` — 9 extracted components

### ✅ Extract Level-Up Wizard from StatsTab
- Moved Level-Up Wizard modal UI, all wizard state (13 `useState` hooks), and all wizard/undo logic → `components/LevelUpWizard.tsx`
- Includes: add-class dialog, undo level-up confirmation, full wizard overlay
- StatsTab reduced from 1,210 lines to ~380 lines
- **Files:** `LevelUpWizard.tsx`, `StatsTab.tsx`

### ✅ Create `useSyncField` Hook
- Eliminates the 40+ duplicated `char.updateField()` + `onFieldChange()` two-line pattern
- Returns `syncField(field, value)` and `syncFields(updates)` batch variant
- **Files:** `hooks/useSyncField.ts`, all extracted tab components

### ✅ Type All Component Props
- Every extracted component has a named TypeScript interface: `StatsTabProps`, `SpellsTabProps`, `EquipmentTabProps`, `SkillsTabProps`, `PowersTabProps`, `ConditionsBarProps`, `DeleteConfirmDialogProps`, `CharacterCreateDialogProps`, `LevelUpWizardProps`

### ✅ Deduplicate Shared Constants
- Abilities array (`ABILITY_DEFINITIONS`) — was duplicated 3 times, now uses shared constant everywhere
- Saves array (`SAVE_DEFINITIONS`) — was duplicated 2 times, now uses shared constant everywhere
- Ability key mapping chain replaced with `ABILITY_KEY_MAP` lookup in LevelUpWizard
- **Files:** `shared/src/gameConstants.ts`, `StatsTab.tsx`, `CharacterCreateDialog.tsx`, `LevelUpWizard.tsx`

---

## ✅ Phase 3 — Type Safety Pass — COMPLETE

Replaced `any` usage with proper types across hooks, pages, and socket communication. 18 files modified.

### ✅ Use `SocketEvents` Constant Everywhere
- Imported `SocketEvents` from `athas-shared` in all server socket handlers and client socket usage
- Replaced all ~60 hardcoded string literals with `SocketEvents.XXX` constants
- Added missing `SERVER_ERROR: 'server:error'` to `SocketEvents`
- **Files:** `socket/index.ts`, `chatEvents.ts`, `mapEvents.ts`, `sheetEvents.ts`, `client/socket.ts`, `game/page.tsx`

### ✅ Type the Socket with Generics
- `SocketData` interface for user metadata (`userId`, `username`, `role`, `campaignId`)
- `ClientToServerEvents` (13 events) and `ServerToClientEvents` (16 events) typed event maps
- `TypedServer`/`TypedSocket` aliases using Socket.io's generic type parameter
- Removed all 8 `(socket as any)` casts → `socket.data.xxx`
- **Files:** `shared/socketEvents.ts`, `server/socket/index.ts`, `guards.ts`, `chatEvents.ts`, `mapEvents.ts`, `sheetEvents.ts`

### ✅ Type Client Hooks and Pages
- 7 `any[]` fields in `useCharacter.ts` → `Skill[]`, `Feat[]`, `PsionicPower[]`, `EquipmentItem[]`, `Spell[]`, `SpellSlots[]`, `ClassFeature[]`
- `EmitFn` (12 overloads) and `OnFn` (16 overloads) typed event wrappers in `useSocket.ts`
- `api.ts` post/patch: `body: any` → `body: B` with generic param
- All ~19 `any` usages in `game/page.tsx` replaced with proper payload types
- **Files:** `useCharacter.ts`, `useSocket.ts`, `game/page.tsx`, `api.ts`

### ✅ Fix Shared Package Type Issues
- Split `enums.ts` (354 lines) into `enums.ts` (6 enums, ~95 lines) + `types.ts` (22 interfaces + 7 type defs)
- 7 type definitions moved from `gameConstants.ts` to `types.ts`
- `SessionData` deduplicated → single definition in shared `types.ts`
- `ClassDataEntry.babProgression` tightened: `string` → `'full' | 'three_quarter' | 'half'`
- `ClassDataEntry.goodSaves` tightened: `string[]` → `('fort' | 'ref' | 'will')[]`
- `LevelUpRecord.prevStats.spellSlots` fixed: `any[]` → `SpellSlots[]`
- Fixed `(character as any)[key]` cast in `checkFeatPrerequisites()`
- **Files:** `shared/types.ts` (new), `enums.ts`, `gameConstants.ts`, `index.ts`, `client/types/game.ts`

---

## ✅ Phase 4 — Performance — COMPLETE

Fixed rendering performance, memory leaks, and unnecessary network calls.

### ✅ Fix TokenLayer Image Cache
- Moved image loading from render phase to `useEffect`
- Replaced `setSelectedId(prev => prev)` re-render hack with `loadedCount` state counter
- Added in-flight deduplication via `Set` ref
- Added cache eviction when tokens are removed
- Wrapped component in `React.memo`
- **Files:** `client/src/app/game/components/TokenLayer.tsx`

### ✅ Add `React.memo` to Pure Components
- Wrapped `ResultItem`, `Badge`, `DetailRow` in `React.memo` (CompendiumSearch)
- Wrapped `TokenLayer` in `React.memo`
- Extracted `ChatMessage` component with `React.memo`, wrapped `ChatLog` in `React.memo`
- Moved `formatTime` to module scope in `ChatLog.tsx`
- **Files:** `CompendiumSearch.tsx`, `TokenLayer.tsx`, `ChatLog.tsx`

### ✅ Fix FogOfWar JSON.parse on Every Render
- Wrapped `JSON.parse(fogMask)` in `useMemo(() => ..., [fogMask])`
- Extracted `flattenPoints` utility to module scope
- **Files:** `client/src/app/game/components/FogOfWar.tsx`

### ✅ Replace PlayerSheetViewer Polling with WebSocket
- Removed `setInterval(fetchCharacters, 10000)` polling — initial HTTP fetch only
- Subscribed to `SERVER_SHEET_UPDATED` and `SERVER_POWER_USED` socket events for real-time updates
- Passed `on` prop from `page.tsx` to wire socket subscription
- **Files:** `PlayerSheetViewer.tsx`, `client/src/app/game/page.tsx`

### ✅ Fix Timer/Debounce Cleanup
- Added `useEffect` cleanup for `debounceRef` in `CompendiumSearch.tsx`
- Added `rollTimerRef` + `useEffect` cleanup in `DiceTray.tsx`
- Replaced `setTimeout(() => onSkillsChange(...), 0)` anti-pattern with `useEffect` in `SkillsTab.tsx`
- **Files:** `CompendiumSearch.tsx`, `DiceTray.tsx`, `SkillsTab.tsx`

---

## ✅ Phase 5 — Test Infrastructure — COMPLETE

Added Vitest test framework and unit tests for pure shared logic. 125 tests across 3 files, all passing.

### ✅ Set Up Vitest
- Installed `vitest` in the shared package
- Added `vitest.config.ts` and `test` script to `shared/package.json`
- **Files:** `shared/package.json`, `shared/vitest.config.ts`

### ✅ Unit Test Game Constants
- 81 tests: XP tables, carrying capacity, multiclass math, size modifiers
- **Files:** `shared/src/__tests__/gameConstants.test.ts`

### ✅ Unit Test Prerequisite Checking
- 28 tests: feat prerequisites and spell eligibility validation
- **Files:** `shared/src/__tests__/prerequisites.test.ts`

### ✅ Unit Test Skills
- 16 tests: skill modifier calculations and class/cross-class rank limits
- **Files:** `shared/src/__tests__/skills.test.ts`

---

## ✅ Phase 6 — Server Hardening — COMPLETE

Added security middleware, input validation, structured logging, database indexes, and graceful shutdown. 18 files modified, 4 new files created.

### ✅ Consolidate Character Field Whitelist
- Moved `ALLOWED_CHARACTER_FIELDS` to `athas-shared` (single source of truth)
- `characters.ts` and `sheetEvents.ts` both import from shared package
- **Files:** `shared/src/gameConstants.ts`, `server/src/routes/characters.ts`, `server/src/socket/sheetEvents.ts`

### ✅ Fix Socket Auth Session Expiry
- Socket `CLIENT_JOIN_CAMPAIGN` handler now checks `user.expiresAt`
- Expired sessions are rejected with error message and disconnect
- **Files:** `server/src/socket/index.ts`

### ✅ Add Security Middleware
- `helmet` for security headers (CSP, X-Frame-Options, etc.)
- Body size limit and nosniff headers were already in place
- **Files:** `server/src/index.ts`, `server/package.json`

### ✅ Add Input Validation
- `zod` schemas for all REST endpoints and socket payloads
- REST routes: `JoinSchema`, `CampaignPatchSchema`, `CharacterCreateSchema`, `CharacterPatchSchema`
- Socket events: `SheetUpdateSchema`, `UsePowerSchema`, `MoveTokenSchema`, `AddTokenSchema`, `RemoveTokenSchema`, `FogRevealSchema`, `DefileSchema`, `RemoveDefileSchema`, `DiceRollSchema`, `ChatMessageSchema`
- ZodError → 400 responses on REST, silent reject on socket
- **Files:** `server/src/validation/schemas.ts` (new), all routes, all socket handlers

### ✅ Extract Map Event Helper
- `updateCampaignJsonField<T>(campaignId, field, mutator)` replaces 6 duplicated fetch→parse→mutate→stringify→update cycles
- Each map event handler reduced to ~3-5 lines
- **Files:** `server/src/socket/helpers.ts` (new), `server/src/socket/mapEvents.ts`

### ✅ Add Database Indexes
- `@@index([campaignId])` on Character model
- `@@index([userId])` on Character model
- `@@index([campaignId])` on ChatMessage model
- Migration: `20260609192921_add_indexes_and_env_url`
- **Files:** `server/src/prisma/schema.prisma`

### ✅ Make Database URL Configurable
- `url = env("DATABASE_URL")` in schema.prisma
- `.env` with default `file:../../prisma/athas.db` for backward compatibility
- `.env.example` with all configurable options documented
- **Files:** `server/src/prisma/schema.prisma`, `server/.env`, `server/.env.example`

### ✅ Add Structured Logging
- `pino` logger with pretty-printing in dev, JSON in production
- `pino-http` request logging middleware
- Configurable log level via `LOG_LEVEL` env var
- All `console.log/error/warn` replaced with `logger.info/error/warn` (except seed script)
- **Files:** `server/src/logger.ts` (new), `server/src/config.ts`, `server/src/index.ts`, all routes, all socket handlers, `server/src/middleware/session.ts`

### ✅ Add Graceful Shutdown
- `SIGTERM`/`SIGINT` → close Socket.io → close HTTP server → disconnect Prisma
- 10-second timeout safety with force exit
- **Files:** `server/src/index.ts`

---

## ✅ Phase 7 — Accessibility & Polish — COMPLETE

Added ARIA attributes, fixed UX issues, and cleaned up minor tech debt. 18 files modified, 1 new file created.

### ✅ Add ARIA Attributes to Modals
- Reusable `useModal(isOpen, onClose)` hook: Escape key, focus trap (Tab/Shift+Tab cycle), focus restoration
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on all 6 modal overlays
- `aria-label="Close"` on all ✕ buttons; added missing ✕ button to GMToolbar Token dialog
- **Files:** `hooks/useModal.ts` (new), `CharacterCreateDialog.tsx`, `DeleteConfirmDialog.tsx`, `CompendiumSearch.tsx`, `GMToolbar.tsx`, `LevelUpWizard.tsx`

### ✅ Add ARIA to Interactive Elements
- `aria-label` on all icon-only buttons (✕ close, +/− modifiers, GM tool buttons, fog/defile reset)
- `role="progressbar"` + `aria-valuenow`/`aria-valuemin`/`aria-valuemax` on 6 progress bars (HP, PSP, XP, encumbrance)
- `role="log"` + `aria-live="polite"` on chat scroll container; `aria-label` on chat input
- `aria-pressed` on condition toggles and GM tool selection buttons
- `aria-label="Brush size"` on fog brush range slider
- **Files:** `ChatLog.tsx`, `DiceTray.tsx`, `GMToolbar.tsx`, `PlayerSheetViewer.tsx`, `ConditionsBar.tsx`, `CharacterSheet.tsx`, `EquipmentTab.tsx`

### ✅ Fix ChatLog Auto-Scroll UX
- Tracks scroll position via `isNearBottom` ref (50px threshold)
- Auto-scroll only when user is at the bottom; shows "New messages ↓" floating button otherwise
- Indicator clears on click or manual scroll-to-bottom
- **Files:** `client/src/app/game/components/ChatLog.tsx`

### ✅ Wire Up Keyboard Shortcuts
- `V` → Select, `F` → Fog Brush, `D` → Defile, `T` → Add Token
- Guarded: ignores when `<input>`, `<textarea>`, or `[contenteditable]` is focused
- **Files:** `client/src/app/game/components/GMToolbar.tsx`

### ✅ Use Next.js Router for Navigation
- `window.location.href = '/game'` → `router.push('/game')` in lobby
- `window.location.href = '/'` → `router.replace('/')` in game (auth guard)
- **Files:** `client/src/app/page.tsx`, `client/src/app/game/page.tsx`

### ✅ Clean Up Minor Issues
- Removed 7 unused CSS custom properties from `globals.css`
- Removed `pdfjs-dist` from root `devDependencies`
- Added `athas-shared` to client `package.json` dependencies explicitly
- Fixed single `onConnectionChange` subscriber → `Set`-based multi-subscriber with unsubscribe
- `uploads.ts` `require('fs')` was already fixed in Phase 1; no change needed
- Shared ESM migration deferred (works via `esModuleInterop`; converting risks breaking server build)
- **Files:** `globals.css`, root `package.json`, `client/package.json`, `socket.ts`

---

## ✅ Phase 8 — Dark Sun Survival Mechanics (A1 + A2) — COMPLETE

Added weapon breakage automation and water/thirst tracking — two core Dark Sun survival mechanics adapted from the Expanded & Revised Boxed Set.

### ✅ A1: Weapon Breaking Automation
- `MATERIAL_BREAKAGE_DC` lookup table: obsidian DC 3, bone DC 2, stone DC 3, wood DC 4, chitin DC 2, hide DC 5, metal null (unbreakable)
- `getBreakageDC(material)` helper with case-insensitive lookup
- `breakageDC` field added to `EquipmentItem` type — derived from material on add
- 🎲 Breakage Check button on non-metal weapons/armor — rolls 1d20, auto-marks broken if ≤ DC
- Toast notification shows roll result ("💔 SHATTERED!" or "✅ Held!") with 5-second auto-dismiss
- Breakage DC displayed alongside material on Equipment tab
- ✨ Metal indicator on metal items with "Unbreakable" tag
- Survival tab shows full equipment durability panel with repair/check buttons
- Broken penalty indicators (text-only): "Damage halved" for weapons, "AC bonus halved" for armor
- 📖 Collapsible breakage rules reference with material DC table

### ✅ A2: Water & Thirst Tracking
- `WATER_REQUIREMENTS` per-race table: all 11 Dark Sun races with active/rest gallons/day
- `getWaterRequirement(race)` helper with Human fallback
- `DEHYDRATION_STAGES`: 4 stages (Hydrated → Thirsty → Dehydrated → Severely Dehydrated)
- `waterSupply` (Float) and `dehydrationStage` (Int) fields on Character model (Prisma migration)
- `waterRequirement` field added to all 11 race entries in `races.json`
- Water supply bar in character header (below HP/PSP) — sky-blue gradient, color-coded by urgency
- Days-remaining estimate displayed alongside water amount
- Survival tab water controls: ±¼, ±½, +1 gallon buttons, "Consume Daily Water" button
- Dehydration stage selector (4-stage toggle) with visual penalty indicators

---

## Future — Dark Sun Survival Mechanics (B-Tier & C-Tier)

### ✅ B1: Heat & Sun Sickness — COMPLETE
**Priority:** Medium | **Source:** Boxed Set pp. 92–95, 108–110

Track sun exposure and progressive sun sickness. The Athasian sun is a lethal environmental hazard.

- **Terrain heat check frequencies:** Salt Flats (1 hr), Sandy Wastes (2 hrs), Rocky Badlands (3 hrs), Scrub Plains (4 hrs), Verdant Belts (6 hrs), Mountains/Forest (8 hrs)
- **Sun sickness progression (4 stages):** Normal → Heat Fatigue (-1) → Heat Stroke (-2, half speed) → Sunstroke (-4, -2 AC, 1d6/hr)
- **Mitigating factors:** Night travel, desert clothing, adequate water, shade (advisory checkboxes)
- **Racial modifiers:** Thri-Kreen +4, Half-Giant/Elf/Dray +2 to CON saves vs heat
- **CON check automation:** Roll button with racial bonus, auto-advances stage on failure
- **Mini heat bar in character header** (only visible when heat sickness active)
- **StatsTab penalty merging:** Heat penalties combined with condition penalties, dynamic banner
- 21 new unit tests (187 total, all passing)
- **Files:** `shared/src/types.ts`, `shared/src/gameConstants.ts`, `shared/src/__tests__/gameConstants.test.ts`, `server/src/prisma/schema.prisma`, `server/src/validation/schemas.ts`, `client/src/hooks/useCharacter.ts`, `client/.../SurvivalTab.tsx`, `client/.../CharacterSheet.tsx`, `client/.../StatsTab.tsx`

### ✅ B2: Travel & Forced March — COMPLETE
**Priority:** Medium | **Source:** Boxed Set pp. 93–95, 105–108

Overland travel with terrain movement modifiers and forced march consequences.

- **Terrain movement modifiers:** 7 terrain types with speed multipliers (Salt Flats ×1, Sandy Wastes ×½, Rocky Badlands ×¾, Scrub Plains ×¾, Verdant Belt ×1, Mountains ×½, Boulder Fields ×½)
- **Forced march:** 4-stage progression (Normal → Fatigued → Exhausted → Collapsed) with D&D 3.5e mechanical penalties (STR/DEX/speed)
- **CON check automation:** DC 10 + extra hours beyond 8, auto-advances stage on failure
- **Travel distance calculator:** Per-character estimate based on speed × terrain multiplier × hours
- **Penalty integration:** March penalties merge into StatsTab penalty pipeline alongside conditions and heat
- **Header bar:** March fatigue status bar appears in CharacterSheet header when stage > 0
- **UI:** Full section in SurvivalTab with progress bar (8-hour threshold marker), terrain speed info, CON check button, stage selector, rest/camp reset, collapsible rules reference
- 33 new unit tests (220 total, all passing)
- **Files:** `shared/src/types.ts`, `shared/src/gameConstants.ts`, `shared/src/__tests__/gameConstants.test.ts`, `server/src/prisma/schema.prisma`, `server/src/validation/schemas.ts`, `client/src/hooks/useCharacter.ts`, `client/.../SurvivalTab.tsx`, `client/.../CharacterSheet.tsx`, `client/.../StatsTab.tsx`

### ✅ B3: Metal Scarcity Polish — COMPLETE
**Priority:** Low | **Source:** Boxed Set pp. 68–75

- **`metalUpgradeCost()` helper** in shared: parses cost strings (e.g. "10 cp"), applies ×100 multiplier, returns formatted result ("1,000 cp")
- **"Forge in Metal" toggle** in CompendiumSearch detail panel: non-metal weapons/armor/shields can be upgraded to metal with ×100 cost, material switches to "metal", breakage note replaced with "True Metal — Unbreakable"
- **Gold styling** on metal items: gold left-border accent on result rows, `metal` badge variant (amber-400/amber-900), enhanced gold glow border+shadow on EquipmentTab metal items
- **GM "⚔ Metal" flag** in PlayerSheetViewer: amber badge appears next to character race when carrying metal equipment, updates in real-time via `equipment` in VIEWER_FIELDS
- 11 new unit tests (231 total, all passing)
- **Files:** `shared/src/gameConstants.ts`, `shared/src/__tests__/gameConstants.test.ts`, `CompendiumSearch.tsx`, `EquipmentTab.tsx`, `PlayerSheetViewer.tsx`

### ✅ C1: Natural Healing Modifiers — COMPLETE
**Priority:** Low

Desert conditions halve natural healing without adequate water and shade.

- `NATURAL_HEALING_RULES` constant: 1 HP/level/day rest, 2 HP/level/day long-term care (Heal DC 15), ×0.5 desert penalty
- `getNaturalHealing(level, hasAdequateWater, hasShade)` helper with `NaturalHealingResult` return type
- 🩹 Natural Healing section in SurvivalTab with shade/water toggles (local state) and healing rate display
- Color-coded: emerald (full healing) / amber (halved), strikethrough on base values, collapsible rules reference
- 12 new unit tests (243 total, all passing)
- **Files:** `shared/src/types.ts`, `shared/src/gameConstants.ts`, `shared/src/__tests__/gameConstants.test.ts`, `client/.../SurvivalTab.tsx`, `client/.../CharacterSheet.tsx`

### ✅ C2: Condition Stat Penalties — COMPLETE
**Priority:** Low | **Prerequisite for B1 and B2**

Wired existing conditions to automatic stat modifiers (previously cosmetic only).

- `ConditionModifiers` interface + `modifiers` field on all 20 `CONDITIONS_3_5E` entries
- `getConditionPenalties()` aggregation function — sums numeric mods, OR's booleans, worst-wins speed
- Fatigued → -2 STR/DEX. Exhausted → -6 STR/DEX, half speed. All 20 conditions have accurate 3.5e penalties.
- StatsTab applies penalties to AC, attack, saves, speed, initiative with visual indicators (red borders, strikethrough, PenaltyTag)
- ConditionsBar shows inline modifier summary on active conditions
- Display-only — raw ability scores stay untouched
- 41 new unit tests (166 total, all passing)
- **Files:** `shared/src/types.ts`, `shared/src/gameConstants.ts`, `shared/src/__tests__/gameConstants.test.ts`, `client/.../StatsTab.tsx`, `client/.../ConditionsBar.tsx`, `client/.../CharacterSheet.tsx`

### ✅ C3: GM Survival Dashboard — COMPLETE
**Priority:** Nice-to-have

GM-facing panel showing party survival status at a glance: water, heat, exhaustion, broken gear, travel speed.

- **New component:** `GMSurvivalDashboard.tsx` — compact grid with one row per character, columns for 💧 water, 🔥 heat, 🥾 march, ⚔️ gear, 🏃 speed
- **Third sidebar tab** "Survival" (GM-only) added to right sidebar alongside Chronicle and Character
- Color-coded stage badges (sky → yellow → orange → red) matching existing SurvivalTab conventions
- Party alert banner when any character is in danger state (stage ≥ 2 or broken gear)
- Real-time WebSocket updates via `SERVER_SHEET_UPDATED` (same pattern as PlayerSheetViewer)
- Collapsible legend with stage color reference
- **Files:** `GMSurvivalDashboard.tsx` (new), `game/page.tsx`
