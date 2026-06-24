import { prisma } from "./prisma";
import { HOLD_MINUTES, type SeatClass } from "./domain";
import type { CreateOrderInput } from "./schemas";

/**
 * Release inventory held by PENDING orders whose hold has expired.
 * Called lazily before reads/writes that depend on accurate `remaining`.
 */
export async function releaseExpiredHolds(now: Date = new Date()) {
  const expired = await prisma.order.findMany({
    where: { status: "PENDING", holdExpiresAt: { lt: now } },
    include: { items: true },
  });
  if (expired.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const order of expired) {
      // re-check inside txn to avoid double-release
      const fresh = await tx.order.findUnique({ where: { id: order.id } });
      if (!fresh || fresh.status !== "PENDING") continue;

      const counts = countByClass(order.items);
      for (const [seatClass, qty] of Object.entries(counts)) {
        await tx.seatInventory.updateMany({
          where: { tripId: order.items[0].tripId, seatClass },
          data: { remaining: { increment: qty } },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", holdExpiresAt: null },
      });
    }
  });
}

function countByClass(items: { seatClass: string }[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, it) => {
    acc[it.seatClass] = (acc[it.seatClass] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Create a PENDING order, reserving inventory atomically and stamping a hold.
 * Throws { code } on validation failures the API maps to 4xx.
 */
export async function createOrder(userId: string, input: CreateOrderInput) {
  await releaseExpiredHolds();
  const qty = input.passengers.length;

  return prisma.$transaction(async (tx) => {
    const inv = await tx.seatInventory.findFirst({
      where: { tripId: input.tripId, seatClass: input.seatClass },
    });
    if (!inv) throw Object.assign(new Error("座位类型不存在"), { code: "NO_INVENTORY" });
    if (inv.remaining < qty)
      throw Object.assign(new Error("余票不足"), { code: "SOLD_OUT" });

    const totalCents = inv.priceCents * qty;
    await tx.seatInventory.update({
      where: { id: inv.id },
      data: { remaining: { decrement: qty } },
    });

    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
    const order = await tx.order.create({
      data: {
        userId,
        status: "PENDING",
        totalCents,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        holdExpiresAt,
        items: {
          create: input.passengers.map((p) => ({
            tripId: input.tripId,
            seatClass: input.seatClass,
            priceCents: inv.priceCents,
            passengerName: p.name,
            passengerIdNo: p.idNo,
          })),
        },
        payment: { create: { amountCents: totalCents, status: "INITIATED" } },
      },
      include: orderInclude,
    });
    return order;
  });
}

/**
 * Simulate payment. `force` deterministically picks the outcome for testing;
 * otherwise ~80% success. On success: order -> PAID, hold committed.
 * On failure: increments attempts, leaves order PENDING for retry.
 */
export async function payOrder(
  userId: string,
  orderId: string,
  force?: "success" | "fail",
) {
  await releaseExpiredHolds();

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payment: true },
  });
  if (!order) throw Object.assign(new Error("订单不存在"), { code: "NOT_FOUND" });
  if (order.status === "PAID")
    return prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (order.status !== "PENDING")
    throw Object.assign(new Error("订单状态无法支付"), { code: "BAD_STATE" });
  if (order.holdExpiresAt && order.holdExpiresAt < new Date())
    throw Object.assign(new Error("订单已超时"), { code: "HOLD_EXPIRED" });

  const ok = force ? force === "success" : Math.random() < 0.8;
  const attempts = (order.payment?.attempts ?? 0) + 1;

  // A failed attempt must persist its bookkeeping (status + attempts), so it is
  // written and committed before we surface the error to the caller. Only the
  // success path needs an atomic order+payment transition.
  if (!ok) {
    await prisma.payment.update({
      where: { orderId },
      data: { status: "FAILED", attempts },
    });
    throw Object.assign(new Error("支付失败，请重试"), { code: "PAYMENT_FAILED" });
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { orderId },
      data: { status: "SUCCEEDED", attempts },
    });
    return tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", holdExpiresAt: null },
      include: orderInclude,
    });
  });
}

/**
 * Cancel a PENDING or PAID order before departure: restore inventory,
 * mark CANCELLED, and stamp a simulated refund if it was paid.
 */
export async function cancelOrder(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { trip: true } }, payment: true },
    });
    if (!order) throw Object.assign(new Error("订单不存在"), { code: "NOT_FOUND" });
    if (order.status === "CANCELLED")
      throw Object.assign(new Error("订单已取消"), { code: "ALREADY_CANCELLED" });

    const earliestDepart = order.items
      .map((i) => i.trip.departAt)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (earliestDepart && earliestDepart < new Date())
      throw Object.assign(new Error("列车已发车，无法取消"), { code: "DEPARTED" });

    const counts = countByClass(order.items);
    for (const [seatClass, qty] of Object.entries(counts)) {
      await tx.seatInventory.updateMany({
        where: { tripId: order.items[0].tripId, seatClass },
        data: { remaining: { increment: qty } },
      });
    }

    if (order.status === "PAID" && order.payment) {
      await tx.payment.update({
        where: { orderId },
        data: { status: "REFUNDED" },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", holdExpiresAt: null },
      include: orderInclude,
    });
  });
}

export const orderInclude = {
  items: { include: { trip: { include: { depStation: true, arrStation: true } } } },
  payment: true,
} as const;
