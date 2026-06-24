// Shared response shapes for client components (subset of Prisma models).

export type Station = { id: string; name: string; code: string; cityId: string };
export type City = { id: string; name: string; pinyin: string; code: string; stations: Station[] };

export type Inventory = {
  id: string;
  seatClass: string;
  priceCents: number;
  total: number;
  remaining: number;
};

export type Trip = {
  id: string;
  trainNo: string;
  departAt: string;
  arriveAt: string;
  depStation: Station & { city?: City };
  arrStation: Station & { city?: City };
  inventories: Inventory[];
};

export type OrderItem = {
  id: string;
  seatClass: string;
  priceCents: number;
  passengerName: string;
  passengerIdNo: string;
  trip: Trip;
};

export type Payment = { status: string; amountCents: number; attempts: number };

export type Order = {
  id: string;
  status: string;
  totalCents: number;
  contactName: string;
  contactPhone: string;
  holdExpiresAt: string | null;
  createdAt: string;
  items: OrderItem[];
  payment: Payment | null;
};
