import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createOrderSchema } from "@/lib/schemas";
import { createOrder, orderInclude, releaseExpiredHolds } from "@/lib/booking";
import { handle, ok, fail } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    if (!user) return fail("未登录", 401, "UNAUTH");
    await releaseExpiredHolds();
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return ok({ orders });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (!user) return fail("未登录", 401, "UNAUTH");
    const input = createOrderSchema.parse(await req.json());
    const order = await createOrder(user.id, input);
    return ok({ order }, 201);
  });
}
