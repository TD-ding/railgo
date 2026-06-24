import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";

// Reads from the database, so render per-request instead of prerendering at
// build time (no seeded DB exists during the Docker image build).
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const cities = await prisma.city.findMany({
      include: { stations: true },
      orderBy: { pinyin: "asc" },
    });
    return ok({ cities });
  });
}
