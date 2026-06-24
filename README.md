# RailGo 🚄

Mobile-first train ticket booking web app for a regional rail startup.
Region: China · Currency: CNY (¥) · UI: Chinese (localizable).

This is a working **end-to-end product**: search → book → pay → manage, with
real loading / empty / error / success states, form validation, a responsive
mobile-framed layout, accessibility basics, and seeded demo data so a reviewer
sees a populated app on first run.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + SQLite for local/sandbox dev (schema is PG-compatible for Vercel/managed Postgres)
- **TanStack Query** for server state (caching, retries, optimistic invalidation)
- **Tailwind CSS** for the mobile-first UI
- **Zod** validation in API handlers, mirrored by client-side validation for inline UX
- Lightweight **phone-OTP** auth with a signed session cookie

## Run it

```bash
pnpm install
pnpm db:reset      # push schema + seed cities/stations/trips + demo orders/user
pnpm dev           # http://localhost:3000
```

**Demo login:** phone `13800000000`. Tap “获取验证码”, then read the 6-digit
code from the **server terminal** (`[OTP] phone=... code=......`) and enter it.
A ready-made OTP `123456` is also seeded for the demo phone.
(OTP delivery is console-only in dev, by design — no SMS provider.)

## Booking journey

`/login` → `/` (search) → `/search` (results) → `/trip/[id]/select` (class + qty)
→ `/book` (passengers) → `/order/[id]/confirm` (10-min hold countdown)
→ `/order/[id]/pay` (simulated, success + fail/retry) → `/orders` → `/order/[id]` (cancel + refund).

### Key behaviors

- **Seat inventory** is `class + quantity` per trip (`SeatInventory`), reserved on
  order create and restored on cancel — all inside Prisma transactions so
  `remaining` never goes negative. It hangs off `Trip`, so a real seat-map table
  can be added later without reshaping orders.
- **10-minute hold:** creating an order stamps `holdExpiresAt`; the confirm/pay
  screens show a live countdown. `releaseExpiredHolds()` reclaims abandoned holds.
- **Payment** is simulated (~80% success, or force `success`/`fail` for demos).
  A failed attempt persists its bookkeeping and leaves the order PENDING for retry.
- **Cancel** anytime before departure restores inventory and stamps a simulated refund.

## Product-quality pass

- **Shared UI primitives** (`src/components/ui.tsx`): `Button` (loading/`aria-busy`),
  `Field` (label + inline error + hint + `aria-invalid`/`aria-describedby`),
  `Spinner`, `Skeleton`/`SkeletonCard`, `EmptyState`, `ErrorState` (retry),
  `StatusPill`, and an accessible `ConfirmDialog` (focus trap, `Esc`, `aria-modal`).
- **States everywhere:** skeletons while loading, retryable error cards on failure,
  friendly empty states (no results / no orders), and clear success surfaces.
- **Validation:** `src/lib/validation.ts` adds CN resident-ID **checksum**,
  passport, phone, name, and OTP rules; wired into the passenger and login forms
  with blur/submit-gated inline errors. The server keeps its Zod schemas as the
  authoritative gate.
- **Responsive + a11y:** mobile column that becomes a centered device frame on
  larger screens, safe-area insets, visible focus rings, `aria-current` nav,
  keyboard-operable dialogs, and `prefers-reduced-motion` support.

## Tests

```bash
pnpm test
```

- `tests/booking.test.ts` — happy path (search → order → pay → list → detail →
  cancel + inventory restore), pay fail-then-retry, sold-out guard.
- `tests/validation.test.ts` — phone / OTP / name / ID-checksum / passport rules.
- `tests/seed.test.ts` — sanity over the seeded DB (cities, trips, OTP, demo orders).

Type-check with `npx tsc --noEmit`.

## Docker deployment

Build and run with Docker:

```bash
docker build -t railgo .
docker run -p 3000:3000 railgo
```

Or use Docker Compose:

```bash
docker-compose up
```

The container automatically initializes the database, runs the seed, and starts the app on port 3000. The SQLite database persists in a named volume (`railgo-db`) across container restarts.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR:
- Type checking
- Database setup + seed
- Full test suite (13 tests)
- Production build verification
- Docker image build

## Seed data

8 cities / main HSR stations (北京/上海/广州/深圳/杭州/南京/武汉/成都) with G-train
trips on key corridors (京沪、广深、沪杭、京宁、京汉、汉穗、京蓉) over a rolling
14-day window. Seat-left is varied deterministically so results show **有票 /
仅剩 N / 无票** states. Three demo orders are pre-seeded (one PAID upcoming, one
PENDING, one CANCELLED + refunded) so `/orders` is populated on first run.

For a reviewer walkthrough of every state and the simulated edges, see
[HANDOFF.md](./HANDOFF.md). See `docs/FOUNDATION.md` for the full data model,
API surface, and scope.
