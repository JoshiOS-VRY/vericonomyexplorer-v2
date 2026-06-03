"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Session debug probes for navigation / hydration issues (debug mode only). */
export function NavigationDebug() {
  const pathname = usePathname();

  useEffect(() => {
    const log = (
      hypothesisId: string,
      message: string,
      data: Record<string, unknown>,
    ) => {
      // #region agent log
      fetch("http://127.0.0.1:7467/ingest/ab8a6164-f60c-4e9b-bb52-1ad2bb3cb660", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "afd8d9",
        },
        body: JSON.stringify({
          sessionId: "afd8d9",
          hypothesisId,
          location: "NavigationDebug.tsx",
          message,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };

    const onError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      if (
        msg.includes("418") ||
        msg.includes("Hydration") ||
        msg.includes("hydration")
      ) {
        log("H1", "hydration-or-418-error", {
          message: msg,
          pathname,
        });
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const top = document.elementFromPoint(cx, cy);

      log("H2", "link-click", {
        href: anchor.getAttribute("href"),
        pathname,
        defaultPrevented: event.defaultPrevented,
        topTag: top?.tagName,
        topMatchesAnchor: top === anchor || anchor.contains(top),
        bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
      });

      window.setTimeout(() => {
        log("H2", "link-click-after", {
          href: anchor.getAttribute("href"),
          pathname: window.location.pathname,
          navigated: window.location.pathname !== pathname,
        });
      }, 400);
    };

    window.addEventListener("error", onError);
    document.addEventListener("click", onClick, true);

    log("H3", "navigation-debug-mounted", { pathname });

    return () => {
      window.removeEventListener("error", onError);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname]);

  return null;
}
