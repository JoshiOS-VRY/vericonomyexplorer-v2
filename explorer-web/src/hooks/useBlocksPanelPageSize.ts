'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import {
  CHAIN_BLOCKS_PANEL_MAX_ROWS,
  CHAIN_BLOCKS_PANEL_MIN_ROWS,
  CHAIN_BLOCKS_PANEL_ROW_PX,
} from '@/lib/chainBlocksDisplay';

function clampRows(rows: number): number {
  return Math.min(CHAIN_BLOCKS_PANEL_MAX_ROWS, Math.max(CHAIN_BLOCKS_PANEL_MIN_ROWS, rows));
}

function computeRows(panelBody: HTMLElement): number {
  const scrollArea = panelBody.querySelector('[data-blocks-panel-scroll]');
  const thead = panelBody.querySelector('.bc-table thead');
  const sampleRow = panelBody.querySelector('.bc-table tbody tr');
  const theadPx = thead?.getBoundingClientRect().height ?? 0;
  const rowPx = sampleRow?.getBoundingClientRect().height ?? CHAIN_BLOCKS_PANEL_ROW_PX;
  const scrollHeight =
    scrollArea?.clientHeight ??
    panelBody.clientHeight -
      (panelBody.querySelector('[data-blocks-panel-footer]')?.getBoundingClientRect().height ?? 0);
  const available = scrollHeight - theadPx;
  if (available <= 0) {
    return CHAIN_BLOCKS_PANEL_MIN_ROWS;
  }
  return clampRows(Math.floor(available / rowPx));
}

/**
 * Fills the chain dashboard blocks panel to the stretched column height.
 * Updates only when the row count changes by ≥2 to limit resize jitter.
 */
export function useBlocksPanelPageSize(panelBodyRef: RefObject<HTMLElement | null>): number {
  const [pageSize, setPageSize] = useState(CHAIN_BLOCKS_PANEL_MIN_ROWS);

  useLayoutEffect(() => {
    const panelBody = panelBodyRef.current;
    if (!panelBody) {
      return;
    }

    let frame = 0;

    const measure = () => {
      const next = computeRows(panelBody);
      setPageSize((prev) => {
        if (prev === next) {
          return prev;
        }
        if (Math.abs(prev - next) < 2) {
          return prev;
        }
        return next;
      });
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(panelBody);
    const scrollArea = panelBody.querySelector('[data-blocks-panel-scroll]');
    if (scrollArea) {
      observer.observe(scrollArea);
    }
    const tbody = panelBody.querySelector('tbody');
    const rowObserver = tbody && new MutationObserver(schedule);
    if (tbody && rowObserver) {
      rowObserver.observe(tbody, { childList: true });
    }
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      rowObserver?.disconnect();
    };
  }, [panelBodyRef]);

  return pageSize;
}
