import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

// Sanity checks over the seeded dev DB so a broken seed fails loudly.

test("seed: cities and stations are present", async () => {
  const cities = await prisma.city.count();
  assert.ok(cities >= 6, `expected >= 6 cities, got ${cities}`);
  const stations = await prisma.station.count();
  assert.equal(stations, cities, "each city should have exactly one station");
});

test("seed: trips exist with three seat classes each", async () => {
  const trips = await prisma.trip.count();
  assert.ok(trips > 100, `expected many trips, got ${trips}`);

  const sample = await prisma.trip.findFirst({ include: { inventories: true } });
  assert.ok(sample);
  assert.equal(sample!.inventories.length, 3, "each trip has 3 seat classes");
  for (const inv of sample!.inventories) {
    assert.ok(inv.priceCents > 0);
    assert.ok(inv.remaining >= 0 && inv.remaining <= inv.total);
  }
});

test("seed: demo user and ready OTP exist", async () => {
  const user = await prisma.user.findUnique({ where: { phone: "13800000000" } });
  assert.ok(user, "demo user 13800000000 should exist");
  const otp = await prisma.otpCode.findFirst({
    where: { phone: "13800000000", code: "123456" },
  });
  assert.ok(otp, "ready OTP 123456 should exist");
});

test("seed: demo orders cover PAID / PENDING / CANCELLED", async () => {
  const statuses = await prisma.order.groupBy({
    by: ["status"],
    _count: true,
  });
  const byStatus = Object.fromEntries(statuses.map((s) => [s.status, s._count]));
  assert.ok(byStatus.PAID, "expected at least one PAID demo order");
  assert.ok(byStatus.PENDING, "expected at least one PENDING demo order");
  assert.ok(byStatus.CANCELLED, "expected at least one CANCELLED demo order");

  // The cancelled order should carry a refunded payment.
  const refunded = await prisma.payment.findFirst({ where: { status: "REFUNDED" } });
  assert.ok(refunded, "cancelled paid order should be refunded");
});
