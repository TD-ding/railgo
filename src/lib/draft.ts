"use client";

import type { SeatClass } from "./domain";

// The in-progress booking selection, persisted across the select->passenger
// steps until POST /api/orders persists it. Kept in sessionStorage so a reload
// mid-flow doesn't lose context.

export type BookingDraft = {
  tripId: string;
  trainNo: string;
  depName: string;
  arrName: string;
  departAt: string;
  arriveAt: string;
  seatClass: SeatClass;
  priceCents: number;
  qty: number;
};

const KEY = "railgo_draft";

export function saveDraft(d: BookingDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(d));
}

export function loadDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as BookingDraft) : null;
}

export function clearDraft() {
  sessionStorage.removeItem(KEY);
}
