import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const cities = await prisma.city.findMany({
      include: { stations: true },
      orderBy: { pinyin: "asc" },
    });
    return ok({ cities });
  });
}
