// Domain constants and shared types. Enum values kept as string unions so they
// work identically on SQLite and Postgres.

export const SEAT_CLASSES = ["BUSINESS", "FIRST", "SECOND"] as const;
export type SeatClass = (typeof SEAT_CLASSES)[number];

export const SEAT_CLASS_LABEL: Record<SeatClass, string> = {
  BUSINESS: "商务座",
  FIRST: "一等座",
  SECOND: "二等座",
};

export const ORDER_STATUSES = ["PENDING", "PAID", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  CANCELLED: "已取消",
};

export const PAYMENT_STATUSES = [
  "INITIATED",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const HOLD_MINUTES = 10;

export function formatCNY(cents: number): string {
  return "¥" + (cents / 100).toFixed(0);
}
