"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import {
  Button,
  Card,
  Header,
  StatusPill,
  ConfirmDialog,
  CenteredSpinner,
  ErrorState,
  friendlyError,
} from "@/components/ui";
import { fmtTime, fmtDate } from "@/lib/format";
import { ORDER_STATUS_LABEL, SEAT_CLASS_LABEL, formatCNY, type OrderStatus, type SeatClass } from "@/lib/domain";
import type { Order } from "@/lib/types";

function Detail() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const justPaid = params.get("paid") === "1";
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ order: Order }>(`/api/orders/${id}`),
  });
  const order = data?.order;

  if (isLoading) {
    return (
      <div>
        <Header title="订单详情" />
        <CenteredSpinner label="正在载入订单…" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div>
        <Header title="订单详情" />
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
  const departed = trip ? new Date(trip.departAt).getTime() < Date.now() : false;
  const canCancel = order.status !== "CANCELLED" && !departed;

  async function cancel() {
    setErr(null);
    setBusy(true);
    try {
      await api.post(`/api/orders/${id}/cancel`);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["order", id] });
      setConfirmOpen(false);
    } catch (e) {
      setErr((e as Error).message);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Header title="订单详情" sub={`订单号 ${order.id.slice(-8)}`} />
      <div className="space-y-4 p-4">
        {justPaid && order.status === "PAID" && (
          <Card className="bg-green-50"><p className="text-sm text-green-700">🎉 支付成功，祝您旅途愉快！</p></Card>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">状态</span>
            <StatusPill status={order.status} label={ORDER_STATUS_LABEL[order.status as OrderStatus]} />
          </div>
          {order.payment?.status === "REFUNDED" && (
            <p className="mt-1 text-right text-xs text-gray-400">已模拟退款</p>
          )}
        </Card>

        {trip && (
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{trip.trainNo}</span>
              <span className="text-xs text-gray-400">{fmtDate(trip.departAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div><div className="text-lg font-semibold">{fmtTime(trip.departAt)}</div><div className="text-xs text-gray-500">{trip.depStation.name}</div></div>
              <span className="text-gray-300">→</span>
              <div className="text-right"><div className="text-lg font-semibold">{fmtTime(trip.arriveAt)}</div><div className="text-xs text-gray-500">{trip.arrStation.name}</div></div>
            </div>
          </Card>
        )}

        <Card className="space-y-2">
          <p className="text-sm font-medium text-gray-700">乘客</p>
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <span>{it.passengerName}</span>
              <span className="text-gray-500">{SEAT_CLASS_LABEL[it.seatClass as SeatClass]} · {formatCNY(it.priceCents)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-sm text-gray-500">合计</span>
            <span className="font-semibold text-orange-600">{formatCNY(order.totalCents)}</span>
          </div>
        </Card>

        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}

        <div className="space-y-2">
          {order.status === "PENDING" && (
            <Button onClick={() => router.push(`/order/${order.id}/pay`)}>去支付</Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={busy}>
              取消订单
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="确认取消订单？"
        body={order.status === "PAID" ? "已支付金额将模拟原路退回。" : "取消后座位将立即释放。"}
        confirmLabel="确认取消"
        cancelLabel="再想想"
        danger
        busy={busy}
        onConfirm={cancel}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <Detail />
    </Suspense>
  );
}
