"use client";

import { useState } from "react";
import { CopyButton } from "@/components/explorer/BlockDetail";

export function AddressShareActions({ address }: { address: string }) {
  const [shareLabel, setShareLabel] = useState("Share");

  async function handleShare() {
    const shareUrl = `${window.location.origin}/vrm/address/${address}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Verium address", url: shareUrl });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share"), 1500);
    } catch {
      setShareLabel("Share failed");
      window.setTimeout(() => setShareLabel("Share"), 1500);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyButton value={address} label="Copy address" />
      <button
        type="button"
        onClick={() => void handleShare()}
        className="copy-btn shrink-0 rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-fg-muted transition hover:border-border-strong hover:text-fg"
      >
        {shareLabel}
      </button>
    </div>
  );
}
