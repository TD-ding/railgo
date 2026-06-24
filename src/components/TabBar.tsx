"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "搜索", icon: "🔍" },
  { href: "/orders", label: "订单", icon: "🎫" },
  { href: "/me", label: "我的", icon: "👤" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="主导航" className="shell-fixed bottom-0 border-t bg-white safe-bottom">
      <div className="grid grid-cols-3">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[48px] flex-col items-center justify-center py-2 text-xs ${
                active ? "text-brand font-medium" : "text-gray-500"
              }`}
            >
              <span className="text-lg" aria-hidden>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
