"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Button, Card, Header, CenteredSpinner, ErrorState, friendlyError } from "@/components/ui";
import { formatCNY } from "@/lib/domain";
import { useCountdown, mmss } from "@/lib/useCountdown";
import type { Order } from "@/lib/types";

export default function PayPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ order: Order }>(`/api/orders/${id}`),
  });
  const order = data?.order;
  const left = useCountdown(order?.holdExpiresAt ?? null);
  const expired = left !== null && left <= 0;

  // `force` lets the demo deterministically exercise both branches.
  async function pay(force?: "success" | "fail") {
    setErr(null);
    setFailed(false);
    setBusy(true);
    try {
      await api.post(`/api/orders/${id}/pay`, force ? { force } : {});
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["order", id] });
      router.replace(`/order/${id}?paid=1`);
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg);
      if (msg.includes("支付失败")) {
        setFailed(true);
        // refresh so the displayed attempt count reflects the server state
        await qc.invalidateQueries({ queryKey: ["order", id] });
      }
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="支付" />
        <CenteredSpinner label="正在载入订单…" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <Header title="支付" />
        <div className="p-4">
          <ErrorState
            message={error ? friendlyError(error) : "未找到该订单"}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  // Already paid — guide the user to the ticket instead of a dead-end.
  if (order.status === "PAID") {
    return (
      <div>
        <Header title="支付" />
        <div className="space-y-4 p-4">
          <Card className="space-y-3 py-8 text-center">
            <div className="text-4xl" aria-hidden>✅</div>
            <p className="font-medium text-gray-800">订单已支付</p>
          </Card>
          <Button onClick={() => router.replace(`/order/${id}`)}>查看车票</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="支付" sub="模拟支付（演示环境）" />
      <div className="space-y-4 p-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">订单金额</span>
            <span className="text-2xl font-semibold text-orange-600">{formatCNY(order.totalCents)}</span>
          </div>
          {order.status === "PENDING" && !expired && left !== null && (
            <p className="mt-2 text-xs text-gray-400">请在 {mmss(left)} 内完成支付</p>
          )}
        </Card>

        {busy && (
          <Card className="flex items-center justify-center gap-2 py-6 text-gray-500">
            <CenteredSpinner label="正在处理支付…" />
          </Card>
        )}

        {expired && (
          <Card className="bg-red-50">
            <p className="text-sm text-red-600">订单已超时，座位已释放。请重新预订。</p>
          </Card>
        )}

        {failed && (
          <Card className="bg-red-50" role="alert">
            <p className="text-sm text-red-600">支付失败，请重试。（已尝试 {order.payment?.attempts ?? 0} 次）</p>
          </Card>
        )}
        {err && !failed && (
          <p className="text-sm text-red-600" role="alert">{err}</p>
        )}

        {expired ? (
          <Button onClick={() => router.replace("/")}>重新预订</Button>
        ) : order.status === "PENDING" && !busy ? (
          <div className="space-y-2">
            <Button onClick={() => pay()} loading={busy}>{failed ? "重试支付" : "确认支付"}</Button>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="ghost" onClick={() => pay("success")} disabled={busy}>模拟成功</Button>
              <Button variant="ghost" onClick={() => pay("fail")} disabled={busy}>模拟失败</Button>
            </div>
            <p className="text-center text-xs text-gray-400">演示：可强制成功或失败以测试两条路径。</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
