import { requireUser } from "@/lib/session";
import { cancelOrder } from "@/lib/booking";
import { handle, ok, fail } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return handle(async () => {
    const user = await requireUser();
    if (!user) return fail("未登录", 401, "UNAUTH");
    const order = await cancelOrder(user.id, params.id);
    return ok({ order });
  });
}
