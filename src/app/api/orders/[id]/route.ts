import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { orderInclude, releaseExpiredHolds } from "@/lib/booking";
import { handle, ok, fail } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return handle(async () => {
    const user = await requireUser();
    if (!user) return fail("未登录", 401, "UNAUTH");
    await releaseExpiredHolds();
    const order = await prisma.order.findFirst({
      where: { id: params.id, userId: user.id },
      include: orderInclude,
    });
    if (!order) return fail("订单不存在", 404, "NOT_FOUND");
    return ok({ order });
  });
}
