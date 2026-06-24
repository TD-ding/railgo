const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  });
}

export function durationLabel(a: string, b: string): string {
  const min = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}时${m}分`;
}

// "06-24 周二" for a YYYY-MM-DD search key (UTC-aligned to match seed keys).
export function dateHeading(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${WEEKDAYS[dt.getUTCDay()]}`;
}

// next N days as YYYY-MM-DD (Asia/Shanghai-aligned, UTC date keys match seed).
// `label` is a relative day name (今天/明天/周X); `md` is the M/D figure.
export function upcomingDates(
  n: number,
): { value: string; label: string; md: string }[] {
  const out: { value: string; label: string; md: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const value = d.toISOString().slice(0, 10);
    const md = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    const label = i === 0 ? "今天" : i === 1 ? "明天" : WEEKDAYS[d.getUTCDay()];
    out.push({ value, label, md });
  }
  return out;
}
