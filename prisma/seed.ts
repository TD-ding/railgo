import { PrismaClient } from "@prisma/client";
import { SEAT_CLASSES } from "../src/lib/domain";

const prisma = new PrismaClient();

// Cities -> their main HSR station
const CITIES = [
  { name: "北京", pinyin: "beijing", code: "BJ", station: { name: "北京南", code: "VNP" } },
  { name: "上海", pinyin: "shanghai", code: "SH", station: { name: "上海虹桥", code: "AOH" } },
  { name: "广州", pinyin: "guangzhou", code: "GZ", station: { name: "广州南", code: "IZQ" } },
  { name: "深圳", pinyin: "shenzhen", code: "SZ", station: { name: "深圳北", code: "IOQ" } },
  { name: "杭州", pinyin: "hangzhou", code: "HZ", station: { name: "杭州东", code: "HGH" } },
  { name: "南京", pinyin: "nanjing", code: "NJ", station: { name: "南京南", code: "NKH" } },
  { name: "武汉", pinyin: "wuhan", code: "WH", station: { name: "汉口", code: "HKO" } },
  { name: "成都", pinyin: "chengdu", code: "CD", station: { name: "成都东", code: "ICW" } },
];

// Corridors: [fromStationCode, toStationCode, durationMin, priceSecondCents]
const CORRIDORS: [string, string, number, number][] = [
  ["VNP", "AOH", 330, 55300], // 京沪
  ["AOH", "VNP", 330, 55300],
  ["IZQ", "IOQ", 35, 7450], // 广深
  ["IOQ", "IZQ", 35, 7450],
  ["AOH", "HGH", 60, 7350], // 沪杭
  ["HGH", "AOH", 60, 7350],
  ["VNP", "NKH", 215, 44350], // 京宁
  ["NKH", "VNP", 215, 44350],
  ["NKH", "AOH", 75, 13450], // 宁沪
  ["AOH", "NKH", 75, 13450],
  ["VNP", "HKO", 270, 52050], // 京汉
  ["HKO", "VNP", 270, 52050],
  ["HKO", "IZQ", 230, 46350], // 汉穗
  ["IZQ", "HKO", 230, 46350],
  ["VNP", "ICW", 480, 81500], // 京蓉
  ["ICW", "VNP", 480, 81500],
];

// Daily departure hours; staggered per corridor so the board feels varied.
const DEPART_HOURS = [6, 8, 10, 12, 14, 16, 18, 20];
const DAYS_AHEAD = 14;

function priceFor(seatClass: string, second: number): number {
  if (seatClass === "SECOND") return second;
  if (seatClass === "FIRST") return Math.round(second * 1.6);
  return Math.round(second * 3.1); // BUSINESS
}

function capacityFor(seatClass: string): number {
  if (seatClass === "BUSINESS") return 10;
  if (seatClass === "FIRST") return 40;
  return 100;
}

/**
 * Deterministic seat-left variance so the results page shows believable
 * states: most trains "有票", some "仅剩 N" (low), a few "无票" (sold out).
 * Driven purely by stable inputs (no Math.random) so the seed is reproducible.
 */
function remainingFor(seatClass: string, total: number, seed: number): number {
  const bucket = seed % 10;
  if (bucket === 0) return 0; // ~10% sold out for this class
  if (bucket <= 2) return Math.max(1, Math.min(total, 1 + (seed % 6))); // low stock 1–6
  if (bucket <= 4) return Math.max(1, Math.round(total * 0.4)); // moderate
  return total; // plenty
}

// Simple stable hash so each (trainNo, seatClass) gets its own variance.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function ymd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function main() {
  // Clean (dev only)
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.seatInventory.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.station.deleteMany();
  await prisma.city.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  const stationByCode = new Map<string, string>();
  for (const c of CITIES) {
    const city = await prisma.city.create({
      data: {
        name: c.name,
        pinyin: c.pinyin,
        code: c.code,
        stations: { create: { name: c.station.name, code: c.station.code } },
      },
      include: { stations: true },
    });
    stationByCode.set(c.station.code, city.stations[0].id);
  }

  let trainSeq = 1;
  const today = ymd(new Date());
  let tripCount = 0;

  // Remember a few trip ids to attach demo orders to (deterministic picks).
  let pendingTripId: string | null = null;
  let paidTripId: string | null = null;
  let cancelledTripId: string | null = null;

  for (let day = 0; day < DAYS_AHEAD; day++) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + day);

    for (let ci = 0; ci < CORRIDORS.length; ci++) {
      const [fromCode, toCode, dur, second] = CORRIDORS[ci];
      const depStationId = stationByCode.get(fromCode)!;
      const arrStationId = stationByCode.get(toCode)!;

      // Stagger departures per corridor so not every route leaves on the hour.
      const hours = DEPART_HOURS.filter((_, idx) => (idx + ci) % 2 === 0 || ci % 3 === idx % 3);

      for (const hour of hours) {
        const trainNo = `G${trainSeq++}`;
        const departAt = new Date(date);
        departAt.setUTCHours(hour, ci % 2 === 0 ? 0 : 30, 0, 0);
        const arriveAt = new Date(departAt.getTime() + dur * 60_000);

        const trip = await prisma.trip.create({
          data: {
            trainNo,
            date,
            depStationId,
            arrStationId,
            departAt,
            arriveAt,
            inventories: {
              create: SEAT_CLASSES.map((sc) => {
                const total = capacityFor(sc);
                return {
                  seatClass: sc,
                  priceCents: priceFor(sc, second),
                  total,
                  remaining: remainingFor(sc, total, hash(trainNo + sc)),
                };
              }),
            },
          },
        });
        tripCount++;

        // Capture deterministic trips for demo orders: first京沪 (VNP→AOH)
        // departure on selected days out, so they read as realistic trips.
        if (fromCode === "VNP" && toCode === "AOH") {
          if (day === 2 && !paidTripId) paidTripId = trip.id;
          if (day === 4 && !pendingTripId) pendingTripId = trip.id;
          if (day === 6 && !cancelledTripId) cancelledTripId = trip.id;
        }
      }
    }
  }

  // Demo user + a ready OTP for review
  const phone = "13800000000";
  const user = await prisma.user.create({ data: { phone, name: "演示用户" } });
  await prisma.otpCode.create({
    data: {
      phone,
      code: "123456",
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  // ---- Pre-seeded demo orders so reviewers see populated states immediately.
  let demoOrders = 0;
  async function seedOrder(
    tripId: string | null,
    seatClass: string,
    status: "PENDING" | "PAID" | "CANCELLED",
    passengers: { name: string; idNo: string }[],
    payment: "INITIATED" | "SUCCEEDED" | "FAILED" | "REFUNDED",
    attempts: number,
  ) {
    if (!tripId) return;
    const inv = await prisma.seatInventory.findFirst({ where: { tripId, seatClass } });
    if (!inv) return;
    const qty = passengers.length;
    const totalCents = inv.priceCents * qty;

    // PENDING and PAID orders hold real seats; ensure stock exists, then
    // reflect the hold in inventory.
    if (status !== "CANCELLED") {
      if (inv.remaining < qty) {
        await prisma.seatInventory.update({
          where: { id: inv.id },
          data: { remaining: Math.min(inv.total, qty + 5) },
        });
      }
      await prisma.seatInventory.update({
        where: { id: inv.id },
        data: { remaining: { decrement: qty } },
      });
    }

    await prisma.order.create({
      data: {
        userId: user.id,
        status,
        totalCents,
        contactName: "演示用户",
        contactPhone: phone,
        holdExpiresAt:
          status === "PENDING" ? new Date(Date.now() + 10 * 60_000) : null,
        items: {
          create: passengers.map((p) => ({
            tripId,
            seatClass,
            priceCents: inv.priceCents,
            passengerName: p.name,
            passengerIdNo: p.idNo,
          })),
        },
        payment: { create: { amountCents: totalCents, status: payment, attempts } },
      },
    });
    demoOrders++;
  }

  // A paid, upcoming trip (the "happy" ticket).
  await seedOrder(
    paidTripId,
    "FIRST",
    "PAID",
    [
      { name: "张伟", idNo: "110101199003071234" },
      { name: "李娜", idNo: "310101199207152345" },
    ],
    "SUCCEEDED",
    1,
  );
  // A pending order still within its hold window.
  await seedOrder(
    pendingTripId,
    "SECOND",
    "PENDING",
    [{ name: "王芳", idNo: "440301199511203456" }],
    "INITIATED",
    0,
  );
  // A cancelled + refunded order.
  await seedOrder(
    cancelledTripId,
    "BUSINESS",
    "CANCELLED",
    [{ name: "刘洋", idNo: "320101198804096789" }],
    "REFUNDED",
    1,
  );

  console.log(
    `Seeded ${CITIES.length} cities, ${tripCount} trips over ${DAYS_AHEAD} days, ${demoOrders} demo orders.`,
  );
  console.log(`Demo login: phone ${phone}, OTP 123456 (or request a fresh one).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
