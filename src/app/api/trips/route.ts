import { prisma } from "@/lib/prisma";
import { tripSearchSchema } from "@/lib/schemas";
import { releaseExpiredHolds } from "@/lib/booking";
import { handle, ok } from "@/lib/api";

export async function GET(req: Request) {
  return handle(async () => {
    await releaseExpiredHolds();
    const url = new URL(req.url);
    const { from, to, date } = tripSearchSchema.parse({
      from: url.searchParams.get("from") ?? "",
      to: url.searchParams.get("to") ?? "",
      date: url.searchParams.get("date") ?? "",
    });

    // from/to are station codes
    const [depStation, arrStation] = await Promise.all([
      prisma.station.findUnique({ where: { code: from } }),
      prisma.station.findUnique({ where: { code: to } }),
    ]);
    if (!depStation || !arrStation) return ok({ trips: [] });

    const day = new Date(`${date}T00:00:00.000Z`);
    const trips = await prisma.trip.findMany({
      where: { date: day, depStationId: depStation.id, arrStationId: arrStation.id },
      include: {
        depStation: { include: { city: true } },
        arrStation: { include: { city: true } },
        inventories: true,
      },
      orderBy: { departAt: "asc" },
    });
    return ok({ trips });
  });
}
