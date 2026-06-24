"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Button, Card, Header, CenteredSpinner, ErrorState, friendlyError } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { SEAT_CLASS_LABEL, formatCNY, type SeatClass } from "@/lib/domain";
import { saveDraft } from "@/lib/draft";
import type { Trip } from "@/lib/types";

export default function SelectPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [seatClass, setSeatClass] = useState<SeatClass | "">("");
  const [qty, setQty] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => api.get<{ trip: Trip }>(`/api/trips/${id}`),
  });
  const trip = data?.trip;
  const inv = trip?.inventories.find((i) => i.seatClass === seatClass);
  const maxQty = Math.min(5, inv?.remaining ?? 5);

  function next() {
    if (!trip || !inv) return;
    saveDraft({
      tripId: trip.id,
      trainNo: trip.trainNo,
      depName: trip.depStation.name,
      arrName: trip.arrStation.name,
      departAt: trip.departAt,
      arriveAt: trip.arriveAt,
      seatClass: inv.seatClass as SeatClass,
      priceCents: inv.priceCents,
      qty,
    });
    router.push("/book");
  }

  if (isLoading) {
    return (
      <div>
        <Header title="选择席别" />
        <CenteredSpinner label="正在载入车次…" />
      </div>
    );
  }
  if (error || !trip) {
    return (
      <div>
        <Header title="选择席别" />
        <div className="p-4">
          <ErrorState
            message={error ? friendlyError(error) : "未找到该车次"}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="选择席别" sub={`${trip.trainNo} · ${trip.depStation.name} → ${trip.arrStation.name}`} />
      <div className="space-y-4 p-4">
        <Card>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{fmtTime(trip.departAt)} 出发</span>
            <span className="text-gray-400">→</span>
            <span className="font-medium">{fmtTime(trip.arriveAt)} 到达</span>
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm text-gray-600">席别</p>
          {trip.inventories.map((i) => {
            const out = i.remaining === 0;
            const active = seatClass === i.seatClass;
            return (
              <button
                key={i.id}
                disabled={out}
                onClick={() => { setSeatClass(i.seatClass as SeatClass); setQty(1); }}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${
                  active ? "border-brand bg-blue-50" : "border-gray-200"
                } ${out ? "opacity-40" : ""}`}
              >
                <span>
                  <span className="font-medium">{SEAT_CLASS_LABEL[i.seatClass as SeatClass]}</span>
                  <span className="ml-2 text-xs text-gray-500">{out ? "无票" : `余${i.remaining}`}</span>
                </span>
                <span className="font-semibold text-orange-600">{formatCNY(i.priceCents)}</span>
              </button>
            );
          })}
        </Card>

        {inv && (
          <Card className="flex items-center justify-between">
            <span className="text-sm text-gray-600">乘客人数</span>
            <div className="flex items-center gap-4">
              <button aria-label="减少人数" className="h-9 w-9 rounded-full bg-gray-100 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="w-6 text-center text-lg" aria-live="polite">{qty}</span>
              <button aria-label="增加人数" className="h-9 w-9 rounded-full bg-gray-100 text-lg" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
            </div>
          </Card>
        )}
      </div>

      <div className="shell-fixed bottom-16 border-t bg-white p-3 safe-bottom">
        <div className="mb-2 flex items-center justify-between px-1 text-sm">
          <span className="text-gray-500">合计</span>
          <span className="text-lg font-semibold text-orange-600">
            {inv ? formatCNY(inv.priceCents * qty) : "—"}
          </span>
        </div>
        <Button onClick={next} disabled={!inv}>填写乘客信息</Button>
      </div>
    </div>
  );
}
