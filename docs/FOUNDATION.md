# RailGo — Foundation Spec (v1, for review)

A mobile-first train ticket booking web app for a regional rail startup.
Region: China · Currency: CNY (¥) · UI copy: Chinese (English-friendly, easy to localize).

This document is the contract we agree on **before** building screens:
1. Stack & conventions
2. Data model (Prisma)
3. Page / route structure
4. API surface
5. State & flow for the booking journey
6. Seed data plan
7. MVP scope & cut lines

---

## 1. Stack & conventions

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One deploy target, server + client, great on Vercel |
| Styling | **Tailwind CSS + shadcn/ui** | Mobile-first utility CSS, accessible primitives, fast |
| Data layer | **Prisma + PostgreSQL** | Typed schema, migrations, managed PG on Vercel/Neon |
| Server logic | **Next Route Handlers** (`app/api/*`) | Keep it simple; no separate backend |
| Validation | **Zod** | Shared request/response schemas, one source of truth |
| Server state | **TanStack Query** | Caching, retries (matters for payment), optimistic cancel |
| Form state | **react-hook-form + Zod resolver** | Passenger forms, validation UX |
| Auth | **Phone OTP**, session cookie (JWT/`iron-session`) | Lightweight, no passwords |
| Money | Integer **cents** (`Int`), format at edges | No float drift |
| IDs | `cuid()` | Safe, non-guessable |
| Dates | UTC in DB, render in `Asia/Shanghai` | Avoid TZ bugs |

Conventions: all amounts stored as integer cents; all API I/O validated by Zod; one order = one or more passengers, one direction (one-way only in v1).

---

## 2. Data model (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  phone     String   @unique           // E.164-ish, CN numbers in v1
  name      String?
  orders    Order[]
  createdAt DateTime @default(now())
}

model OtpCode {
  id        String   @id @default(cuid())
  phone     String
  code      String                      // 6-digit; hashed in prod, plain in dev seed
  expiresAt DateTime
  consumed  Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([phone])
}

model City {
  id       String    @id @default(cuid())
  name     String                       // 北京, 上海
  pinyin   String                       // beijing  (search/sort)
  code     String    @unique            // BJ, SH
  stations Station[]
}

model Station {
  id        String   @id @default(cuid())
  name      String                      // 北京南
  code      String   @unique            // VNP
  cityId    String
  city      City     @relation(fields: [cityId], references: [id])
  depTrips  Trip[]   @relation("DepStation")
  arrTrips  Trip[]   @relation("ArrStation")
}

// A scheduled, dated, sellable run of a train. Seed-generated for a date range.
model Trip {
  id            String      @id @default(cuid())
  trainNo       String                      // G1, G7
  date          DateTime    @db.Date         // service date
  depStationId  String
  arrStationId  String
  depStation    Station     @relation("DepStation", fields: [depStationId], references: [id])
  arrStation    Station     @relation("ArrStation", fields: [arrStationId], references: [id])
  departAt      DateTime                     // full timestamp (UTC)
  arriveAt      DateTime
  inventories   SeatInventory[]
  orderItems    OrderItem[]
  @@index([date, depStationId, arrStationId])
}

// Seat class + price + remaining count per trip. This is the growth seam:
// today = class+quota; later a SeatMap/Seat table can hang off the same Trip.
model SeatInventory {
  id         String    @id @default(cuid())
  tripId     String
  trip       Trip      @relation(fields: [tripId], references: [id])
  seatClass  SeatClass                       // enum
  priceCents Int
  total      Int
  remaining  Int                             // decremented on confirm, restored on cancel
  @@unique([tripId, seatClass])
}

enum SeatClass { BUSINESS FIRST SECOND }     // 商务座 / 一等座 / 二等座

model Order {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  status      OrderStatus   @default(PENDING)
  totalCents  Int
  contactName String
  contactPhone String
  items       OrderItem[]
  payment     Payment?
  createdAt   DateTime      @default(now())
  @@index([userId, createdAt])
}

// PENDING -> PAID -> CANCELLED  (PENDING also -> CANCELLED on timeout/abandon)
enum OrderStatus { PENDING PAID CANCELLED }

model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id])
  seatClass   SeatClass
  priceCents  Int                            // snapshot at purchase
  passengerName     String
  passengerIdNo     String                   // ID/passport, snapshot
}

model Payment {
  id          String        @id @default(cuid())
  orderId     String        @unique
  order       Order         @relation(fields: [orderId], references: [id])
  status      PaymentStatus @default(INITIATED)
  amountCents Int
  attempts    Int           @default(0)      // drives the simulated retry flow
  createdAt   DateTime      @default(now())
}

enum PaymentStatus { INITIATED SUCCEEDED FAILED }
```

**Why this shape:** one `Order` → many `OrderItem` (one item per passenger per trip) supports multiple passengers cleanly. `SeatInventory` is class+quantity today but lives on `Trip`, so a future `Seat`/`SeatMap` table attaches to the same `Trip` without reshaping orders. Prices are snapshotted on `OrderItem` so historical orders stay correct.

---

## 3. Page / route structure (App Router, mobile-first)

```
/login                 Phone + OTP
/                      Search: from/to city+station, date, passenger count
/search                Results: trip list for date with class prices
/trip/[id]/select      Pick seat class + quantity
/book                  Passenger info form (n passengers) + contact
/order/[id]/confirm    Review order, total
/order/[id]/pay        Payment placeholder (success / fail+retry)
/orders                Order history (list)
/order/[id]            Order detail + Cancel action
```

Layout: bottom tab bar (搜索 / 订单 / 我的), max-width mobile container, sticky CTA buttons.

---

## 4. API surface (Route Handlers, all Zod-validated)

| Method & path | Purpose |
|---|---|
| `POST /api/auth/otp` | Request OTP for phone (dev: returns/logs code) |
| `POST /api/auth/verify` | Verify OTP → set session cookie |
| `GET  /api/cities` | Cities + their stations (for pickers) |
| `GET  /api/trips?from=&to=&date=` | Search trips (station codes + date) with inventory/prices |
| `GET  /api/trips/:id` | Trip detail + seat classes |
| `POST /api/orders` | Create PENDING order; validate + reserve inventory (txn) |
| `GET  /api/orders` | Current user's orders |
| `GET  /api/orders/:id` | Order detail |
| `POST /api/orders/:id/pay` | Simulate payment; success or fail (with `force` for testing) |
| `POST /api/orders/:id/cancel` | Cancel order; restore inventory (txn) |

Inventory correctness: reserve on order create and on successful pay; restore on cancel — all inside Prisma transactions so `remaining` never goes negative.

---

## 5. State & flow (booking journey)

```
Login(OTP) → Search(from,to,date) → Results → Select(class,qty)
   → Passengers(n) → Confirm(total) → Pay ──success──→ Order PAID → Orders/Detail
                                        └─fail──→ retry → (success | abandon→cancel)
   Order Detail → Cancel → inventory restored → CANCELLED
```

- **Server state** via TanStack Query (search results, orders, detail). Query keys: `['trips',filters]`, `['orders']`, `['order',id]`.
- **Booking draft** (selected trip, class, qty, passengers) held in a small client store / URL params until `POST /api/orders` persists it.
- **Payment retries**: `pay` may return `FAILED`; UI shows retry; `Payment.attempts` increments. We can force outcomes for demo via a param.
- **Cancel** uses optimistic update + invalidation of `['orders']` / `['order',id]`.

State machine: `Order: PENDING → PAID → CANCELLED`; `Payment: INITIATED → SUCCEEDED | FAILED (retryable)`.

---

## 6. Seed data plan

- **Cities/stations:** 北京(北京南), 上海(上海虹桥), 广州(广州南), 深圳(深圳北), 杭州(杭州东), 南京(南京南).
- **Trips:** generate G-trains on key corridors (京沪 Beijing–Shanghai, 广深 Guangzhou–Shenzhen, 沪杭, etc.) for a rolling **+14 day** window, a handful of departures/day.
- **Inventory:** each trip gets BUSINESS/FIRST/SECOND with realistic CNY prices and finite `remaining` (so sell-out + cancel-restore are demoable).
- One **demo user** + a seeded OTP for easy login during review.

---

## 7. MVP scope

**In:** OTP login · city/station + date search · results · class+qty select · multi-passenger form · confirm · simulated pay (success + fail/retry) · order history · order detail · cancel (whole order) · seed data · mobile UI.

**Cut for v1 (designed to grow into):** seat maps/specific seats · round-trip/multi-leg · real payment gateway · refunds-with-fees logic · i18n framework (copy kept localizable) · admin tooling · live rail feeds.

---

## Decisions (signed off)

1. **OTP delivery in dev** — **console/log only.** `POST /api/auth/otp` logs the 6-digit code to the server terminal; no SMS provider in v1.
2. **Inventory** — **reserved hold with 10-minute expiry.** Creating an order reserves inventory and stamps `Order.holdExpiresAt = now + 10min`. Checkout shows a **prominent countdown**. On pay-success the hold is committed; on expiry/cancel the hold is released and `remaining` restored. A `releaseExpiredHolds()` sweep (called lazily on read + on relevant writes) reclaims abandoned holds. All in Prisma transactions.
3. **Cancellation** — **cancel anytime before departure** with a **simulated refund** (`Payment.status` reflects refund; inventory restored). No post-departure or partial-refund logic in v1.

Schema delta: `Order` gains `holdExpiresAt DateTime?`; `PaymentStatus` gains `REFUNDED`.
