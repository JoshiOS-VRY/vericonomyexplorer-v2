/** Fixed page size for block tables — avoids dynamic 8–24 resize jitter. */
export const LATEST_BLOCKS_COUNT = 10;

/** Visual strip shows the newest N blocks (table shows full count). */
export const LATEST_BLOCKS_STRIP_COUNT = 5;

export const LATEST_BLOCKS_POLL_MS = 2_000;

/** Chain dashboard blocks panel: row height estimate for fill-height sizing. */
export const CHAIN_BLOCKS_PANEL_ROW_PX = 44;

export const CHAIN_BLOCKS_PANEL_MIN_ROWS = 10;

/** Cap live poll size on the dashboard blocks table. */
export const CHAIN_BLOCKS_PANEL_MAX_ROWS = 40;
