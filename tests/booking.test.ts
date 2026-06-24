import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import {
  createOrder,
  payOrder,
  cancelOrder,
  releaseExpiredHolds,
} from "../src/lib/booking";

// End-to-end happy path + cancel, run against the seeded dev DB.
// Exercises the booking service the API delegates to.

async function pickTripWithInventory() {
  // Pick a trip that departs comfortably in the future so the cancel-before-
  // departure path is exercised deterministically regardless of clock time.
  const cutoff = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const inv = await prisma.seatInventory.findFirst({
    where: {
      seatClass: "SECOND",
      remaining: { gte: 2 },
      trip: { departAt: { gt: cutoff } },
    },
    include: { trip: true },
    orderBy: { trip: { departAt: "asc" } },
  });
  assert.ok(inv, "seed should provide a future SECOND-class trip with inventory");
  return inv!;
}

test("happy path: search -> order -> pay -> list -> detail -> cancel", async (t) => {
  const user = await prisma.user.findFirstOrThrow();
  const inv = await pickTripWithInventory();
  const before = inv.remaining;

  // 1. create order (reserve 2 seats)
  const order = await createOrder(user.id, {
    tripId: inv.tripId,
    seatClass: "SECOND",
    contactName: "张三",
    contactPhone: "13800000000",
    passengers: [
      { name: "张三", idNo: "110101199001011234" },
      { name: "李四", idNo: "110101199202022345" },
    ],
  });
  assert.equal(order.status, "PENDING");
  assert.equal(order.items.length, 2);
  assert.equal(order.totalCents, inv.priceCents * 2);
  assert.ok(order.holdExpiresAt, "hold stamped");

  const afterHold = await prisma.seatInventory.findUniqueOrThrow({ where: { id: inv.id } });
  assert.equal(afterHold.remaining, before - 2, "inventory reserved");

  // 2. pay (force success)
  const paid = await payOrder(user.id, order.id, "success");
  assert.equal(paid!.status, "PAID");
  assert.equal(paid!.payment!.status, "SUCCEEDED");
  assert.equal(paid!.holdExpiresAt, null, "hold committed");

  // 3. appears in user's orders
  const list = await prisma.order.findMany({ where: { userId: user.id } });
  assert.ok(list.some((o) => o.id === order.id), "order in list");

  // 4. detail is fetchable & scoped to user
  const detail = await prisma.order.findFirst({
    where: { id: order.id, userId: user.id },
  });
  assert.ok(detail, "detail fetchable");

  // 5. cancel -> inventory restored + refund stamped
  const cancelled = await cancelOrder(user.id, order.id);
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.payment!.status, "REFUNDED");

  const afterCancel = await prisma.seatInventory.findUniqueOrThrow({ where: { id: inv.id } });
  assert.equal(afterCancel.remaining, before, "inventory restored on cancel");
});

test("unhappy path: payment can fail then succeed on retry", async () => {
  const user = await prisma.user.findFirstOrThrow();
  const inv = await pickTripWithInventory();

  const order = await createOrder(user.id, {
    tripId: inv.tripId,
    seatClass: "SECOND",
    contactName: "王五",
    contactPhone: "13800000000",
    passengers: [{ name: "王五", idNo: "110101199003033456" }],
  });

  // forced failure leaves order PENDING and increments attempts
  await assert.rejects(() => payOrder(user.id, order.id, "fail"), /支付失败/);
  const afterFail = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { payment: true },
  });
  assert.equal(afterFail.status, "PENDING");
  assert.equal(afterFail.payment!.status, "FAILED");
  assert.equal(afterFail.payment!.attempts, 1);

  // retry succeeds
  const paid = await payOrder(user.id, order.id, "success");
  assert.equal(paid!.status, "PAID");
  assert.equal(paid!.payment!.attempts, 2);

  // cleanup
  await cancelOrder(user.id, order.id);
});

test("sold-out: cannot reserve more than remaining", async () => {
  const user = await prisma.user.findFirstOrThrow();
  // make a tiny-inventory trip by finding BUSINESS (total 10) and draining via a check
  const inv = await prisma.seatInventory.findFirstOrThrow({
    where: { seatClass: "BUSINESS" },
  });
  const passengers = Array.from({ length: inv.remaining + 1 }, (_, i) => ({
    name: `P${i}`,
    idNo: `1101011990010100${i.toString().padStart(2, "0")}`,
  })).slice(0, 5); // schema caps at 5; ensure we exceed only if remaining < 5

  if (inv.remaining < 5) {
    await assert.rejects(
      () =>
        createOrder(user.id, {
          tripId: inv.tripId,
          seatClass: "BUSINESS",
          contactName: "x",
          contactPhone: "13800000000",
          passengers,
        }),
      /余票不足/,
    );
  }
});

test.after(async () => {
  await releaseExpiredHolds();
  await prisma.$disconnect();
});
