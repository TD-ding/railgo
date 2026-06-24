# HANDOFF — reviewing RailGo

A 10-minute guide to run, click through, and review the app. Written for a
teammate who has never seen the codebase.

## 1. Run

```bash
pnpm install
pnpm db:reset      # schema + seed (cities, trips, demo orders, demo user)
pnpm dev           # http://localhost:3000
```

If port 3000 is taken: `pnpm dev -p 3100`.

**Log in:** go to `/login` (or tap 我的 → 去登录).
- Phone is pre-filled: `13800000000`.
- Tap **获取验证码**, then enter `123456` (seeded), or read the fresh code printed
  in the **server terminal** as `[OTP] phone=13800000000 code=......`.
- OTP is console-only by design — there is no SMS provider.

## 2. Click-path for each state

### Search (`/`)
- Pick **出发城市** / **到达城市** via the route block; use the round **swap** button
  to reverse them. Picking the same city both ends shows an inline error and the
  search button stays disabled.
- The horizontal **date strip** (今天 / 明天 / 14 days) drives the query.

### Results (`/search`)
- **Loading:** skeleton cards appear first (throttle the network in devtools to
  see them linger).
- **Populated:** scannable train cards — big depart/arrive times, duration +
  train number on the journey line, seat-class chips, and `起 ¥…` price.
- **Seat states:** chips show **有票** (green), **仅剩 N** (amber), **无票**
  (grey, struck-through). Sold-out trains are dimmed and non-tappable. The seed
  varies this deterministically, so you'll see all three by scrolling.
- **Empty:** search a corridor with no service (e.g. pick a date far out on a
  thin route) → 🚆 “该线路当天暂无车次” with a 返回修改 action.
- **Error:** stop the dev server and retry the page → retryable error card.

### Select class (`/trip/[id]/select`)
- Choose a seat class (sold-out classes are disabled) and passenger count
  (capped at remaining / 5). The total updates live.

### Passengers (`/book`)
- **Validation (the key thing to review):** each passenger has a
  **身份证 / 护照** toggle.
  - Resident ID is **checksum-validated** (try `110101199003071233` ✓ vs.
    `110101199003071231` ✗).
  - Names must be CJK/latin (digits rejected); phone must be a valid CN mobile.
  - Errors appear on **blur** or on a failed **submit**, inline under each field,
    wired with `aria-invalid` / `aria-describedby`.

### Confirm (`/order/[id]/confirm`)
- Shows a **live 10-minute hold countdown**. Let it hit zero to see the
  “已超时” state and a disabled pay button.

### Pay (`/order/[id]/pay`)
- **Force the outcome:** use **模拟成功** / **模拟失败** to deterministically test
  both branches (real flow is ~80% success).
- **Failure** shows a red card with the attempt count and keeps the order PENDING
  so you can **重试**.
- **Processing** shows a spinner; **success** routes to the ticket with a 🎉 banner.
- Revisit a paid order's pay URL → it guides you to the ticket instead of dead-ending.

### Orders (`/orders`) & detail (`/order/[id]`)
- Pre-seeded with **PAID (upcoming)**, **PENDING**, and **CANCELLED (refunded)**
  orders, each with a colored status pill.
- **Cancel** opens an **accessible confirm dialog** (focus-trapped, `Esc` to close).
  Cancelling restores inventory; a paid order shows “已模拟退款”.
- **Empty state:** with a fresh login on a user with no orders → 🎫 “还没有订单”.

### Me (`/me`)
- Profile + quick links + **退出登录** (also via the confirm dialog).

## 3. Accessibility / responsive notes

- Resize the browser wide → the app renders as a **centered phone frame**; narrow
  → full-width mobile. Bottom bars respect safe-area insets.
- Tab through any screen: focus rings are visible; the tab bar marks the active
  item with `aria-current`; dialogs trap focus and restore it on close.
- A skip-link (“跳到主要内容”) is the first focusable element.
- `prefers-reduced-motion` disables the spinner/skeleton animations.

## 4. Tests

```bash
pnpm test            # booking flow + validation + seed sanity
npx tsc --noEmit     # type-check
```

> The tests run against the seeded dev DB. If you've clicked through and mutated
> the demo orders (e.g. cancelled the PAID one), run `pnpm db:reset` to restore
> them before re-running the seed-sanity test.

## 5. Deliberate limitations (by design for this build)

- **OTP** is console/log-only — no SMS integration.
- **Payment** is simulated — no real gateway; success/fail is forced or ~80% random.
- **Cancellation** is full-refund / full-restore, only before departure.
- **Inventory** is `class + count` per trip, not a real seat map.
- SQLite locally; the schema is Postgres-compatible (enums modeled as strings).
- Client validation mirrors but does not replace the server's Zod schemas.

## 6. Suggested next steps

- Real SMS/OTP provider + rate limiting; real payment gateway + webhook reconciliation.
- Seat-map selection layered onto `SeatInventory` (the model already isolates this).
- Partial refunds / change-of-itinerary; round-trip & multi-leg orders.
- i18n extraction (copy is centralized and localizable) and English locale.
- Server-driven pagination/filtering on results for larger networks.
