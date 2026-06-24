import { requireUser } from "@/lib/session";
import { handle, ok, fail } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    if (!user) return fail("未登录", 401, "UNAUTH");
    return ok({ id: user.id, phone: user.phone, name: user.name });
  });
}
