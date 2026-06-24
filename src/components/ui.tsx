"use client";

import { clsx } from "clsx";
import { forwardRef, useEffect, useId, useRef } from "react";

/* ----------------------------------------------------------------------------
 * Button
 * -------------------------------------------------------------------------- */

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger";
    loading?: boolean;
  }
>(function Button(
  { className, variant = "primary", loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        // 44px min tap target
        "min-h-[44px]",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "ghost" && "bg-gray-100 text-gray-700 hover:bg-gray-200",
        variant === "danger" && "bg-red-50 text-red-600 hover:bg-red-100",
        className,
      )}
      {...props}
    >
      {loading && <Spinner size={16} className={variant === "primary" ? "text-white" : "text-current"} />}
      {children}
    </button>
  );
});

/* ----------------------------------------------------------------------------
 * Header
 * -------------------------------------------------------------------------- */

export function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="bg-brand px-4 pt-6 pb-5 text-white">
      <h1 className="text-xl font-semibold">{title}</h1>
      {sub && <p className="mt-1 text-sm text-white/90">{sub}</p>}
    </header>
  );
}

/* ----------------------------------------------------------------------------
 * Card
 * -------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("rounded-2xl bg-white p-4 shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Field — labelled input with inline validation + a11y wiring
 * -------------------------------------------------------------------------- */

export function Field({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errId = `${inputId}-err`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(
          "w-full rounded-xl border px-3 py-2.5 text-base outline-none transition",
          "focus:border-brand focus:ring-2 focus:ring-brand/20",
          error ? "border-red-400 bg-red-50/40" : "border-gray-300",
        )}
        {...props}
      />
      {error ? (
        <p id={errId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Badge / StatusPill
 * -------------------------------------------------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "ok" | "low" | "none" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
        tone === "ok" && "bg-emerald-50 text-emerald-700",
        tone === "low" && "bg-amber-50 text-amber-700",
        tone === "none" && "bg-gray-100 text-gray-400 line-through",
        tone === "neutral" && "bg-gray-100 text-gray-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

const ORDER_PILL: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", ORDER_PILL[status] ?? "bg-gray-100 text-gray-600")}>
      {label}
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * Spinner / Skeleton
 * -------------------------------------------------------------------------- */

export function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={clsx("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="加载中"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded bg-gray-200/80", className)} />;
}

export function SkeletonCard() {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="flex gap-2 border-t pt-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------------------
 * EmptyState / ErrorState
 * -------------------------------------------------------------------------- */

export function EmptyState({
  icon = "🗂️",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="space-y-3 py-10 text-center">
      <div className="text-4xl" aria-hidden>{icon}</div>
      <p className="font-medium text-gray-700">{title}</p>
      {hint && <p className="text-sm text-gray-500">{hint}</p>}
      {action && <div className="pt-1">{action}</div>}
    </Card>
  );
}

export function ErrorState({
  title = "出了点问题",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="space-y-3 py-10 text-center" role="alert">
      <div className="text-4xl" aria-hidden>⚠️</div>
      <p className="font-medium text-gray-800">{title}</p>
      {message && <p className="text-sm text-gray-500">{message}</p>}
      {onRetry && (
        <div className="mx-auto max-w-[12rem] pt-1">
          <Button variant="ghost" onClick={onRetry}>重试</Button>
        </div>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------------------------
 * QueryBoundary — uniform loading / error / empty handling for queries
 * -------------------------------------------------------------------------- */

export function QueryBoundary<T>({
  isLoading,
  error,
  data,
  onRetry,
  loadingFallback,
  isEmpty,
  emptyFallback,
  children,
  errorMessage,
}: {
  isLoading: boolean;
  error: unknown;
  data: T | undefined;
  onRetry?: () => void;
  loadingFallback?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyFallback?: React.ReactNode;
  children: (data: T) => React.ReactNode;
  errorMessage?: string;
}) {
  if (isLoading) {
    return <>{loadingFallback ?? <CenteredSpinner />}</>;
  }
  if (error) {
    return <ErrorState message={errorMessage ?? friendlyError(error)} onRetry={onRetry} />;
  }
  if (data === undefined) {
    return <ErrorState message="未能加载数据" onRetry={onRetry} />;
  }
  if (isEmpty && isEmpty(data) && emptyFallback) {
    return <>{emptyFallback}</>;
  }
  return <>{children(data)}</>;
}

export function CenteredSpinner({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
      <Spinner className="text-brand" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function friendlyError(error: unknown): string {
  const msg = (error as Error)?.message ?? "";
  if (!msg || /failed to fetch|networkerror|load failed/i.test(msg)) {
    return "网络异常，请检查连接后重试。";
  }
  return msg;
}

/* ----------------------------------------------------------------------------
 * ConfirmDialog — accessible modal replacing window.confirm
 * -------------------------------------------------------------------------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
      if (e.key === "Tab") {
        // simple focus trap within the panel
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        {body && <p className="mt-2 text-sm text-gray-600">{body}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button
            ref={confirmRef}
            variant={danger ? "danger" : "primary"}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
