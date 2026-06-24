"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Button, Card, Header, CenteredSpinner, ErrorState, friendlyError } from "@/components/ui";
import { fmtTime, fmtDate } from "@/lib/format";
import { SEAT_CLASS_LABEL, formatCNY, type SeatClass } from "@/lib/domain";
import { useCountdown, mmss } from "@/lib/useCountdown";
import type { Order } from "@/lib/types";

export default function ConfirmPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ order: Order }>(`/api/orders/${id}`),
  });
  const order = data?.order;
  const left = useCountdown(order?.holdExpiresAt ?? null);

  if (isLoading) {
    return (
      <div>
        <Header title="确认订单" />
        <CenteredSpinner label="正在载入订单…" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <Header title="确认订单" />
        <div className="p-4">
          <ErrorState
            message={error ? friendlyError(error) : "未找到该订单"}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  const trip = order.items[0]?.trip;
  const expired = left !== null && left <= 0;

  return (
    <div>
      <Header title="确认订单" sub="请在保留时间内完成支付" />
      <div className="space-y-4 p-4">
        {order.status === "PENDING" && (
          <Card className={expired ? "bg-red-50" : "bg-orange-50"}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">座位保留</span>
              <span className={`text-lg font-semibold ${expired ? "text-red-600" : "text-orange-600"}`}>
                {expired ? "已超时" : left !== null ? `剩余 ${mmss(left)}` : "—"}
              </span>
            </div>
          </Card>
        )}

        {trip && (
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{trip.trainNo}</span>
              <span className="text-xs text-gray-400">{fmtDate(trip.departAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{fmtTime(trip.departAt)}</div>
                <div className="text-xs text-gray-500">{trip.depStation.name}</div>
              </div>
              <span className="text-gray-300">→</span>
              <div className="text-right">
                <div className="text-lg font-semibold">{fmtTime(trip.arriveAt)}</div>
                <div className="text-xs text-gray-500">{trip.arrStation.name}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="space-y-2">
          <p className="text-sm font-medium text-gray-700">乘客（{order.items.length}）</p>
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <span>{it.passengerName} · {SEAT_CLASS_LABEL[it.seatClass as SeatClass]}</span>
              <span className="text-gray-500">{formatCNY(it.priceCents)}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="shell-fixed bottom-16 border-t bg-white p-3 safe-bottom">
        <div className="mb-2 flex items-center justify-between px-1 text-sm">
          <span className="text-gray-500">应付</span>
          <span className="text-lg font-semibold text-orange-600">{formatCNY(order.totalCents)}</span>
        </div>
        <Button onClick={() => router.push(`/order/${order.id}/pay`)} disabled={expired || order.status !== "PENDING"}>
          {expired ? "订单已超时" : "去支付"}
        </Button>
      </div>
    </div>
  );
}
