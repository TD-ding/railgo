import { z } from "zod";
import { SEAT_CLASSES } from "./domain";

export const phoneSchema = z
  .string()
  .regex(/^1\d{10}$/, "请输入有效的手机号"); // CN mobile

export const otpRequestSchema = z.object({ phone: phoneSchema });

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "请输入6位验证码"),
});

export const tripSearchSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const passengerSchema = z.object({
  name: z.string().min(1, "请输入姓名"),
  idNo: z.string().min(4, "请输入有效证件号"),
});

export const createOrderSchema = z.object({
  tripId: z.string().min(1),
  seatClass: z.enum(SEAT_CLASSES),
  contactName: z.string().min(1),
  contactPhone: phoneSchema,
  passengers: z.array(passengerSchema).min(1).max(5),
});

export const paySchema = z.object({
  // optional override to deterministically test the unhappy path
  force: z.enum(["success", "fail"]).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
