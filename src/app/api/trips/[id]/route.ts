import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds } from "@/lib/booking";
import { handle, ok, fail } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return handle(async () => {
    await releaseExpiredHolds();
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        depStation: { include: { city: true } },
        arrStation: { include: { city: true } },
        inventories: true,
      },
    });
    if (!trip) return fail("车次不存在", 404, "NOT_FOUND");
    return ok({ trip });
  });
}
