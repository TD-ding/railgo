"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Card, Field, Header } from "@/components/ui";
import { SEAT_CLASS_LABEL, formatCNY } from "@/lib/domain";
import { loadDraft, clearDraft, type BookingDraft } from "@/lib/draft";
import {
  validateName,
  validateIdNo,
  validatePhone,
  type IdType,
} from "@/lib/validation";
import type { Order } from "@/lib/types";

type Passenger = { name: string; idNo: string; idType: IdType };

export default function BookPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("13800000000");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    if (!d) {
      router.replace("/");
      return;
    }
    setDraft(d);
    setPassengers(
      Array.from({ length: d.qty }, () => ({ name: "", idNo: "", idType: "id" as IdType })),
    );
  }, [router]);

  // Compute per-field errors regardless of touched state.
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {
      contactName: validateName(contactName),
      contactPhone: validatePhone(contactPhone),
    };
    passengers.forEach((p, i) => {
      e[`name-${i}`] = validateName(p.name);
      e[`id-${i}`] = validateIdNo(p.idNo, p.idType);
    });
    return e;
  }, [contactName, contactPhone, passengers]);

  const valid = Object.values(errors).every((x) => x == null);

  if (!draft) return null;

  function update(i: number, key: keyof Passenger, val: string) {
    setPassengers((ps) => ps.map((p, idx) => (idx === i ? { ...p, [key]: val } : p)));
  }

  function markTouched(key: string) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  /** Show an error only after the field was blurred, or after a submit attempt. */
  function shown(key: string): string | undefined {
    if (!touched[key] && !submitAttempted) return undefined;
    return errors[key] ?? undefined;
  }

  async function submit() {
    setSubmitAttempted(true);
    if (!draft || !valid) return;
    setErr(null);
    setBusy(true);
    try {
      const { order } = await api.post<{ order: Order }>("/api/orders", {
        tripId: draft.tripId,
        seatClass: draft.seatClass,
        contactName,
        contactPhone,
        passengers: passengers.map((p) => ({ name: p.name.trim(), idNo: p.idNo.trim() })),
      });
      clearDraft();
      router.replace(`/order/${order.id}/confirm`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("未登录")) {
        router.push(`/login?next=${encodeURIComponent("/book")}`);
        return;
      }
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Header title="填写乘客信息" sub={`${draft.trainNo} · ${SEAT_CLASS_LABEL[draft.seatClass]}`} />
      <div className="space-y-4 p-4">
        {passengers.map((p, i) => (
          <Card key={i} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">乘客 {i + 1}</p>
              <div className="flex gap-1" role="group" aria-label="证件类型">
                {(["id", "passport"] as IdType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update(i, "idType", t)}
                    aria-pressed={p.idType === t}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      p.idType === t ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t === "id" ? "身份证" : "护照"}
                  </button>
                ))}
              </div>
            </div>
            <Field
              label="姓名"
              value={p.name}
              onChange={(e) => update(i, "name", e.target.value)}
              onBlur={() => markTouched(`name-${i}`)}
              placeholder="与证件一致"
              error={shown(`name-${i}`)}
              autoComplete="name"
            />
            <Field
              label="证件号"
              value={p.idNo}
              onChange={(e) => update(i, "idNo", e.target.value)}
              onBlur={() => markTouched(`id-${i}`)}
              placeholder={p.idType === "id" ? "18 位身份证号" : "护照号"}
              error={shown(`id-${i}`)}
              inputMode={p.idType === "id" ? "numeric" : "text"}
            />
          </Card>
        ))}

        <Card className="space-y-3">
          <p className="text-sm font-medium text-gray-700">联系人</p>
          <Field
            label="姓名"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            onBlur={() => markTouched("contactName")}
            error={shown("contactName")}
            autoComplete="name"
          />
          <Field
            label="手机号"
            inputMode="numeric"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            onBlur={() => markTouched("contactPhone")}
            error={shown("contactPhone")}
            hint="接收订单与出行通知"
            autoComplete="tel"
          />
        </Card>

        {err && (
          <p className="text-sm text-red-600" role="alert">{err}</p>
        )}
      </div>

      <div className="shell-fixed bottom-16 border-t bg-white p-3 safe-bottom">
        <div className="mb-2 flex items-center justify-between px-1 text-sm">
          <span className="text-gray-500">合计 {passengers.length} 张</span>
          <span className="text-lg font-semibold text-orange-600">
            {formatCNY(draft.priceCents * passengers.length)}
          </span>
        </div>
        <Button onClick={submit} loading={busy} disabled={submitAttempted && !valid}>
          {busy ? "提交中…" : "提交订单"}
        </Button>
      </div>
    </div>
  );
}
