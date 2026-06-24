import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { TabBar } from "@/components/TabBar";

export const metadata: Metadata = {
  title: "RailGo · 火车票预订",
  description: "区域铁路出行预订",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Note: no maximumScale — users must be able to pinch-zoom (a11y).
  themeColor: "#0d6efd",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <div className="app-shell">
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:text-white"
            >
              跳到主要内容
            </a>
            <main id="main" className="flex-1 overflow-y-auto pb-20">
              {children}
            </main>
            <TabBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
