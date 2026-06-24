/**
 * Client-side validation helpers for inline form UX.
 *
 * These mirror and *strengthen* the server-side zod schemas in `schemas.ts`
 * (which remain the authoritative gate). The API still enforces its own rules;
 * this module exists purely to give users immediate, friendly feedback before
 * they submit. No data-model or API contract depends on it.
 *
 * All messages are Chinese product copy, kept centralised so they can be
 * localised later.
 */

/** CN mobile number: 11 digits starting with 1. */
export function validatePhone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "请输入手机号";
  if (!/^1\d{10}$/.test(v)) return "手机号格式不正确";
  return null;
}

/** 6-digit OTP. */
export function validateOtp(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "请输入验证码";
  if (!/^\d{6}$/.test(v)) return "验证码为 6 位数字";
  return null;
}

/** Passenger name: at least 2 chars, letters/CJK/·/space only. */
export function validateName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "请输入姓名";
  if (v.length < 2) return "姓名太短";
  if (!/^[一-龥A-Za-z·•\s]+$/.test(v)) return "姓名只能包含中文、字母或·";
  return null;
}

const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const ID_CHECK = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

/** Resident ID (18-digit) checksum per GB 11643-1999. */
function validateResidentId(v: string): string | null {
  if (!/^\d{17}[\dXx]$/.test(v)) return "身份证号为 18 位";
  // birth date sanity (positions 7-14: YYYYMMDD)
  const y = Number(v.slice(6, 10));
  const m = Number(v.slice(10, 12));
  const d = Number(v.slice(12, 14));
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
    return "身份证号中的出生日期无效";
  }
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(v[i]) * ID_WEIGHTS[i];
  const expected = ID_CHECK[sum % 11];
  if (v[17].toUpperCase() !== expected) return "身份证号校验位不正确";
  return null;
}

/** Passport: 5–17 alphanumerics. */
function validatePassport(v: string): string | null {
  if (!/^[A-Za-z0-9]{5,17}$/.test(v)) return "护照号格式不正确";
  return null;
}

export type IdType = "id" | "passport";

/**
 * Validate an ID/passport number. If `type` is omitted we infer: a value that
 * looks like an 18-char resident ID is checksum-validated, otherwise treated
 * as a passport.
 */
export function validateIdNo(raw: string, type?: IdType): string | null {
  const v = raw.trim();
  if (!v) return "请输入证件号";
  const resolved: IdType =
    type ?? (/^\d{17}[\dXx]$/.test(v) || v.length === 18 ? "id" : "passport");
  return resolved === "id" ? validateResidentId(v) : validatePassport(v);
}

/** True when every value in the record is null (no errors). */
export function isClean(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((e) => e == null);
}
