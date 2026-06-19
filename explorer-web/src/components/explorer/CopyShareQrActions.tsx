'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, QrCode, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

interface CopyShareQrActionsProps {
  copyValue: string;
  shareUrl: string;
  shareTitle: string;
  copyLabel?: string;
  className?: string;
}

export function CopyShareQrActions({
  copyValue,
  shareUrl,
  shareTitle,
  copyLabel = 'Copy',
  className,
}: CopyShareQrActionsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrOpen) return;

    void QRCode.toDataURL(shareUrl, {
      width: 160,
      margin: 1,
      color: { dark: '#e2e8f0', light: '#0b1018' },
    }).then(setQrDataUrl);
  }, [qrOpen, shareUrl]);

  useEffect(() => {
    if (!qrOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (qrRef.current && !qrRef.current.contains(event.target as Node)) {
        setQrOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [qrOpen]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 1800);
    } catch {
      setShareState('failed');
      window.setTimeout(() => setShareState('idle'), 1800);
    }
  }

  return (
    <div className={cn('relative flex flex-wrap items-center gap-1.5', className)}>
      <button type="button" onClick={() => void handleCopy()} className="action-btn">
        {copyState === 'copied' ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Failed' : copyLabel}
      </button>

      <button type="button" onClick={() => void handleShare()} className="action-btn">
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Failed' : 'Share'}
      </button>

      <div className="relative" ref={qrRef}>
        <button
          type="button"
          onClick={() => setQrOpen((open) => !open)}
          className={cn('action-btn', qrOpen && 'border-accent/40 bg-accent/10 text-accent')}
          aria-expanded={qrOpen}
          aria-label="Show QR code"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          QR
        </button>

        {qrOpen ? (
          <div className="qr-popover" role="dialog" aria-label="QR code">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="" width={160} height={160} />
            ) : (
              <div className="skeleton-shimmer h-40 w-40 rounded-md" />
            )}
            <p className="mt-2 max-w-[10rem] text-center text-[10px] leading-snug text-fg-subtle">
              Scan to open on mobile
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
