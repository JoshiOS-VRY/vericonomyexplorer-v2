import type { Metadata } from "next";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { getUiThemeDefault } from "@/lib/env";
import "./globals.css";

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

  return (
    <html lang="en" suppressHydrationWarning data-ui-theme={defaultTheme}>
      <head>
        {/* Blocking theme boot avoids flash; native script avoids next/script webpack issues */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-boot.js" />
      </head>
      <body className="min-h-full bg-bg text-fg antialiased">
        <AppShell pathname={pathname}>
          {children}
        </AppShell>
        <script src="/explorer-ui.js" defer />
      </body>
    </html>
  );
}
