import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { getChainSummary } from "@/lib/api/indexer";
import { getUiThemeDefault } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "VeriConomy Explorer",
    template: "%s | VeriConomy Explorer",
  },
  description:
    "Dual-chain blockchain explorer for VeriCoin and Verium with source-labeled data.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const defaultTheme = getUiThemeDefault();
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const [initialVrmSummary, initialVrcSummary] = await Promise.all([
    getChainSummary("vrm").catch(() => null),
    getChainSummary("vrc").catch(() => null),
  ]);

  return (
    <html lang="en" suppressHydrationWarning data-ui-theme={defaultTheme} className={inter.variable}>
      <head>
        {/* Blocking theme boot avoids flash; native script avoids next/script webpack issues */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-boot.js" />
      </head>
      <body className={`${inter.className} min-h-full bg-bg text-fg antialiased`}>
        <AppShell
          pathname={pathname}
          initialVrmSummary={initialVrmSummary}
          initialVrcSummary={initialVrcSummary}
        >
          {children}
        </AppShell>
        <script src="/explorer-ui.js" defer />
      </body>
    </html>
  );
}
