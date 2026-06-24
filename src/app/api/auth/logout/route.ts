import { clearSession } from "@/lib/session";
import { handle, ok } from "@/lib/api";

export async function POST() {
  return handle(async () => {
    clearSession();
    return ok({ ok: true });
  });
}
