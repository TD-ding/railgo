import { prisma } from "@/lib/prisma";
import { otpRequestSchema } from "@/lib/schemas";
import { handle, ok } from "@/lib/api";

export async function POST(req: Request) {
  return handle(async () => {
    const { phone } = otpRequestSchema.parse(await req.json());
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await prisma.otpCode.create({
      data: { phone, code, expiresAt: new Date(Date.now() + 5 * 60_000) },
    });
    // Dev delivery: console only.
    console.log(`\n[OTP] phone=${phone} code=${code} (valid 5 min)\n`);
    return ok({ sent: true });
  });
}
