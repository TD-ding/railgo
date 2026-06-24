import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

// Wrap a handler to translate Zod + service errors into HTTP responses.
export function handle(fn: () => Promise<NextResponse>) {
  return fn().catch((e: unknown) => {
    if (e instanceof ZodError) {
      return fail(e.issues[0]?.message ?? "参数错误", 422, "VALIDATION");
    }
    const code = (e as { code?: string })?.code;
    const map: Record<string, number> = {
      NOT_FOUND: 404,
      SOLD_OUT: 409,
      NO_INVENTORY: 409,
      HOLD_EXPIRED: 410,
      DEPARTED: 409,
      BAD_STATE: 409,
      ALREADY_CANCELLED: 409,
      PAYMENT_FAILED: 402,
    };
    if (code && map[code]) return fail((e as Error).message, map[code], code);
    console.error("Unhandled API error:", e);
    return fail("服务器错误", 500, "INTERNAL");
  });
}
