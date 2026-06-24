import { requireUser } from "@/lib/session";
import { paySchema } from "@/lib/schemas";
import { payOrder } from "@/lib/booking";
import { handle, ok, fail } from "@/lib/api";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  return handle(async () => {
    const user = await requireUser();
    if (!user) return fail("未登录", 401, "UNAUTH");
    const body = await req.json().catch(() => ({}));
    const { force } = paySchema.parse(body);
    const order = await payOrder(user.id, params.id, force);
    return ok({ order });
  });
}
