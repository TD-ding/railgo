import { prisma } from "@/lib/prisma";
import { otpVerifySchema } from "@/lib/schemas";
import { setSession } from "@/lib/session";
import { handle, ok, fail } from "@/lib/api";

export async function POST(req: Request) {
  return handle(async () => {
    const { phone, code } = otpVerifySchema.parse(await req.json());
    const otp = await prisma.otpCode.findFirst({
      where: { phone, code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) return fail("验证码无效或已过期", 401, "BAD_OTP");

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });
    setSession(user.id);
    return ok({ id: user.id, phone: user.phone });
  });
}
