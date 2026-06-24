"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Field, Header, Card } from "@/components/ui";
import { validatePhone, validateOtp } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [phone, setPhone] = useState("13800000000");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<{ phone?: boolean; code?: boolean }>({});
  const [err, setErr] = useState<string | null>(null);

  const phoneErr = validatePhone(phone);
  const codeErr = validateOtp(code);

  async function sendOtp() {
    setTouched((t) => ({ ...t, phone: true }));
    if (phoneErr) return;
    setErr(null);
    setBusy(true);
    try {
      await api.post("/api/auth/otp", { phone });
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setTouched((t) => ({ ...t, code: true }));
    if (codeErr) return;
    setErr(null);
    setBusy(true);
    try {
      await api.post("/api/auth/verify", { phone, code });
      router.replace(next);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Header title="登录 RailGo" sub="使用手机号 + 验证码登录" />
      <div className="space-y-4 p-4">
        <Card className="space-y-4">
          <Field
            label="手机号"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            placeholder="请输入手机号"
            disabled={sent}
            error={touched.phone ? phoneErr ?? undefined : undefined}
          />
          {sent && (
            <Field
              label="验证码"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, code: true }))}
              placeholder="请输入 6 位验证码"
              error={touched.code ? codeErr ?? undefined : undefined}
              hint="验证码已发送，请查看服务器终端日志"
            />
          )}
          {err && (
            <p className="text-sm text-red-600" role="alert">{err}</p>
          )}
          {!sent ? (
            <Button onClick={sendOtp} loading={busy} disabled={!!phoneErr}>
              {busy ? "发送中…" : "获取验证码"}
            </Button>
          ) : (
            <Button onClick={verify} loading={busy} disabled={!!codeErr}>
              {busy ? "验证中…" : "登录"}
            </Button>
          )}
          {sent && !busy && (
            <button
              type="button"
              onClick={() => setSent(false)}
              className="w-full text-center text-sm text-gray-500 underline-offset-2 hover:underline"
            >
              换个手机号
            </button>
          )}
        </Card>
        <p className="px-1 text-xs text-gray-400">
          演示环境：验证码会输出到服务器终端日志。演示账号 13800000000 可用验证码 123456。
        </p>
      </div>
    </div>
  );
}
