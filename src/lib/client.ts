// Tiny typed fetch helper for client components.

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `请求失败 (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T,>(url: string) => req<T>(url),
  post: <T,>(url: string, body?: unknown) =>
    req<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
};
