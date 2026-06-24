"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Card, Badge, ErrorState, friendlyError } from "@/components/ui";
import { fmtTime, durationLabel, dateHeading } from "@/lib/format";
import { SEAT_CLASS_LABEL, formatCNY, type SeatClass } from "@/lib/domain";
import type { Trip, Inventory } from "@/lib/types";

const LOW_STOCK = 10;

function seatTone(remaining: number): "ok" | "low" | "none" {
  if (remaining <= 0) return "none";
  if (remaining <= LOW_STOCK) return "low";
  return "ok";
}

function seatLabel(i: Inventory): string {
  const name = SEAT_CLASS_LABEL[i.seatClass as SeatClass];
  if (i.remaining <= 0) return `${name} 无票`;
  if (i.remaining <= LOW_STOCK) return `${name} 仅剩${i.remaining}`;
  return `${name} 有票`;
}

function SummaryBar({ from, to, date, count }: { from: string; to: string; date: string; count: number | null }) {
  return (
    <div className="sticky top-0 z-10 bg-brand px-4 pb-3 pt-5 text-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {from} <span className="px-1 text-white/70">→</span> {to}
          </h1>
          <p className="mt-0.5 text-sm text-white/80">
            {dateHeading(date)}
            {count !== null && <span className="ml-2">· {count} 个车次</span>}
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium active:scale-95"
        >
          修改
        </Link>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-6 w-16 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-100" />
        <div className="h-6 w-16 rounded bg-gray-200" />
      </div>
      <div className="flex gap-2 border-t pt-3">
        <div className="h-6 w-16 rounded bg-gray-100" />
        <div className="h-6 w-16 rounded bg-gray-100" />
        <div className="h-6 w-16 rounded bg-gray-100" />
      </div>
    </Card>
  );
}

function TripCard({ t }: { t: Trip }) {
  const available = t.inventories.filter((i) => i.remaining > 0);
  const minPrice = available.length
    ? Math.min(...available.map((i) => i.priceCents))
    : Math.min(...t.inventories.map((i) => i.priceCents));
  const soldOut = available.length === 0;
  // Order chips by class so they read consistently: 商务 / 一等 / 二等
  const order: SeatClass[] = ["BUSINESS", "FIRST", "SECOND"];
  const chips = [...t.inventories].sort(
    (a, b) => order.indexOf(a.seatClass as SeatClass) - order.indexOf(b.seatClass as SeatClass),
  );

  return (
    <Link href={`/trip/${t.id}/select`} className={soldOut ? "pointer-events-none" : ""}>
      <Card className={`space-y-3 ${soldOut ? "opacity-60" : ""}`}>
        {/* Times row */}
        <div className="flex items-center">
          <div className="w-20 shrink-0">
            <div className="text-2xl font-bold leading-none tracking-tight">{fmtTime(t.departAt)}</div>
            <div className="mt-1 truncate text-xs text-gray-500">{t.depStation.name}</div>
          </div>
          <div className="flex flex-1 flex-col items-center px-2">
            <div className="text-xs text-gray-400">{durationLabel(t.departAt, t.arriveAt)}</div>
            <div className="my-1 flex w-full items-center text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="flex-1 border-t border-dashed border-gray-300" />
              <span className="text-[10px]">›</span>
            </div>
            <div className="rounded bg-gray-50 px-1.5 text-xs font-medium text-brand">{t.trainNo}</div>
          </div>
          <div className="w-20 shrink-0 text-right">
            <div className="text-2xl font-bold leading-none tracking-tight">{fmtTime(t.arriveAt)}</div>
            <div className="mt-1 truncate text-xs text-gray-500">{t.arrStation.name}</div>
          </div>
        </div>

        {/* Seat chips + price */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((i) => (
              <Badge key={i.id} tone={seatTone(i.remaining)}>
                {seatLabel(i)}
              </Badge>
            ))}
          </div>
          <div className="shrink-0 pl-2 text-right">
            <span className="text-xs text-gray-400">起</span>
            <span className="ml-0.5 text-lg font-bold text-orange-600">{formatCNY(minPrice)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Results() {
  const params = useSearchParams();
  const from = params.get("from")!;
  const to = params.get("to")!;
  const date = params.get("date")!;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["trips", from, to, date],
    queryFn: () => api.get<{ trips: Trip[] }>(`/api/trips?from=${from}&to=${to}&date=${date}`),
  });

  const trips = data?.trips ?? [];
  // Route endpoints for the header come from the first trip when available.
  const fromName = trips[0]?.depStation.name ?? from;
  const toName = trips[0]?.arrStation.name ?? to;

  return (
    <div>
      <SummaryBar from={fromName} to={toName} date={date} count={isLoading || error ? null : trips.length} />
      <div className="space-y-3 p-4">
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!isLoading && error && (
          <ErrorState
            title="查询失败"
            message={friendlyError(error)}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && trips.length === 0 && (
          <Card className="space-y-3 py-8 text-center">
            <div className="text-3xl">🚆</div>
            <p className="text-gray-600">该线路当天暂无车次</p>
            <p className="text-sm text-gray-400">换个日期，或返回修改出发/到达城市。</p>
            <Link
              href="/"
              className="mt-2 inline-block rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
            >
              返回修改
            </Link>
          </Card>
        )}

        {!isLoading && !error && trips.map((t) => <TripCard key={t.id} t={t} />)}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-gray-400">加载中…</p>}>
      <Results />
    </Suspense>
  );
}
