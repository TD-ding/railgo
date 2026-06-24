"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Button, Card, Header, CenteredSpinner, ConfirmDialog } from "@/components/ui";

type Me = { id: string; phone: string; name: string | null };

export default function MePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, error, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/api/auth/me"),
    retry: false,
  });

  async function logout() {
    setBusy(true);
    try {
      await api.post("/api/auth/logout");
      qc.clear();
      router.replace("/login");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div>
      <Header title="我的" />
      <div className="space-y-4 p-4">
        {isLoading && <CenteredSpinner />}

        {!isLoading && error && (
          <Card className="space-y-3 py-8 text-center">
            <div className="text-4xl" aria-hidden>👤</div>
            <p className="text-sm text-gray-600">登录后即可查看订单与行程。</p>
            <div className="mx-auto max-w-[12rem]">
              <Button onClick={() => router.push("/login?next=/me")}>去登录</Button>
            </div>
          </Card>
        )}

        {data && (
          <>
            <Card className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-xl" aria-hidden>
                  🧳
                </div>
                <div>
                  <p className="font-medium">{data.name || "RailGo 用户"}</p>
                  <p className="text-sm text-gray-500">{data.phone}</p>
                </div>
              </div>
            </Card>

            <Card className="divide-y">
              <Link href="/orders" className="flex items-center justify-between py-3 text-sm">
                <span>我的订单</span>
                <span className="text-gray-300" aria-hidden>›</span>
              </Link>
              <Link href="/" className="flex items-center justify-between py-3 text-sm">
                <span>搜索车票</span>
                <span className="text-gray-300" aria-hidden>›</span>
              </Link>
            </Card>

            <Button variant="ghost" onClick={() => setConfirmOpen(true)}>退出登录</Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="退出登录？"
        body="退出后需要重新使用验证码登录。"
        confirmLabel="退出"
        cancelLabel="取消"
        danger
        busy={busy}
        onConfirm={logout}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
