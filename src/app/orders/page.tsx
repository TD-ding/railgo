"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import {
  Header,
  Card,
  StatusPill,
  SkeletonCard,
  EmptyState,
  ErrorState,
  Button,
  friendlyError,
} from "@/components/ui";
import { fmtTime, fmtDate } from "@/lib/format";
import { ORDER_STATUS_LABEL, formatCNY, type OrderStatus } from "@/lib/domain";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<{ orders: Order[] }>("/api/orders"),
    retry: false,
  });

  const needsLogin = !!error && (error as Error).message.includes("未登录");

  useEffect(() => {
    if (needsLogin) {
      router.replace(`/login?next=${encodeURIComponent("/orders")}`);
    }
  }, [needsLogin, router]);

  const orders = data?.orders ?? [];

  return (
    <div>
      <Header title="我的订单" />
      <div className="space-y-3 p-4">
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!isLoading && error && !needsLogin && (
          <ErrorState message={friendlyError(error)} onRetry={() => refetch()} />
        )}

        {!isLoading && !error && orders.length === 0 && (
          <EmptyState
            icon="🎫"
            title="还没有订单"
            hint="搜索车次，几步即可完成购票。"
            action={
              <div className="mx-auto max-w-[12rem]">
                <Link href="/">
                  <Button>去订票</Button>
                </Link>
              </div>
            }
          />
        )}

        {orders.map((o) => {
          const trip = o.items[0]?.trip;
          return (
            <Link key={o.id} href={`/order/${o.id}`} className="block">
              <Card className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{trip?.trainNo}</span>
                  <StatusPill status={o.status} label={ORDER_STATUS_LABEL[o.status as OrderStatus]} />
                </div>
                {trip && (
                  <div className="flex items-center justify-between text-sm">
                    <span>{trip.depStation.name} → {trip.arrStation.name}</span>
                    <span className="text-gray-400">{fmtDate(trip.departAt)} {fmtTime(trip.departAt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-gray-500">{o.items.length} 张</span>
                  <span className="font-semibold text-orange-600">{formatCNY(o.totalCents)}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
