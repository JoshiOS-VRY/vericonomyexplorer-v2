export interface SourceInfo {
  label: string;
  type?: string;
  trustLevel?: string;
  healthStatus?: string;
  message?: string;
}

export interface AmountDisplay {
  amount: string;
  ticker: string;
}

export interface ChainHealthHeights {
  bestRpcHeight: number | null;
  minIndexedHeight: number | null;
  maxIndexedHeight: number | null;
  lastIndexedHeight: number | null;
  blocksBehind: number | null;
  tipThreshold?: number;
}

export interface ChainHealthCounts {
  indexedBlockCount: number;
  expectedBlockCount: number;
  gapCount: number;
  unresolvedSpendCount: number;
  addressCount: number;
}

export interface ChainHealthSyncState {
  status: string | null;
  statusMessage: string | null;
  updatedAt: number | null;
  lastIndexedHash: string | null;
}

export interface ExplorerStatus {
  label: string;
  message: string;
  syncing: boolean;
  blocksBehind?: number;
}

export interface ChainHealth {
  id: string;
  ticker?: string;
  name?: string;
  consensus?: string | null;
  status: string;
  trusted: boolean;
  trustLevel?: string;
  message: string;
  reasons?: string[];
  checks: Record<string, boolean>;
  heights: ChainHealthHeights;
  counts: ChainHealthCounts;
  syncState?: ChainHealthSyncState;
  sourceLabels: Record<string, string>;
  explorerStatus?: ExplorerStatus;
}

export interface IndexedBlock {
  height: number;
  hash: string;
  previousHash?: string | null;
  nextHash?: string | null;
  time: number | null;
  txCount: number;
  size?: number | null;
  difficulty?: string | null;
  outputCount?: number | null;
  extractedBy?: string | null;
  extractedByAddress?: string | null;
}

export interface IndexedTransaction {
  txid: string;
  blockHeight: number;
  blockHash?: string;
  txIndex?: number;
  time: number | null;
  isCoinbase?: boolean;
  isCoinstake?: boolean;
  source?: string;
}

export interface Paging {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ChainSummary {
  chainId: string;
  health: ChainHealth;
  latestBlocks: IndexedBlock[];
  recentTransactions: IndexedTransaction[];
  source: SourceInfo;
}

export interface RichlistItem {
  rank: number;
  address: string;
  balance: AmountDisplay;
  totalReceived: AmountDisplay;
  totalSent: AmountDisplay;
  txCount: number;
  lastSeenHeight: number | null;
}

export interface RichlistResult {
  chainId: string;
  trusted: boolean;
  enabled?: boolean;
  message?: string;
  source: SourceInfo;
  health?: ChainHealth;
  paging?: Paging;
  items: RichlistItem[];
}

export interface LeaderboardItem {
  rank: number;
  address: string;
  received: AmountDisplay;
  sent: AmountDisplay;
  net: AmountDisplay;
  netAtomic: string;
  txCount: number;
  lastSeenHeight: number | null;
}

export interface LeaderboardResult {
  chainId: string;
  trusted: boolean;
  enabled?: boolean;
  message?: string;
  source: SourceInfo;
  health?: ChainHealth;
  label?: string;
  period?: { type: string; start: number; end: number };
  sort?: string;
  paging?: Paging;
  items: LeaderboardItem[];
}

export interface AddressTransaction {
  txid: string;
  blockHeight: number;
  blockHash?: string;
  time: number | null;
  isCoinbase?: boolean;
  isCoinstake?: boolean;
  netDelta: AmountDisplay;
  netDeltaAtomic: string;
}

export interface AddressResult {
  found: boolean;
  address: string;
  balance: {
    balance: AmountDisplay;
    totalReceived: AmountDisplay;
    totalSent: AmountDisplay;
    txCount: number;
  };
  transactions: AddressTransaction[];
  paging: Paging;
  source: SourceInfo;
}

export interface TxInput {
  n: number;
  address: string | null;
  value: AmountDisplay | null;
}

export interface TxOutput {
  n: number;
  address: string | null;
  scriptType?: string;
  value: AmountDisplay;
  isSpent: boolean;
  spentByTxid?: string | null;
}

export interface AddressEvent {
  address: string;
  eventType: string;
  delta: AmountDisplay;
  deltaAtomic: string;
}

export interface TransactionResult {
  found: boolean;
  txid?: string;
  transaction?: IndexedTransaction & { txIndex: number };
  inputs: TxInput[];
  outputs: TxOutput[];
  addressEvents: AddressEvent[];
  source: SourceInfo;
}

export interface BlockResult {
  found: boolean;
  query?: string;
  block?: IndexedBlock;
  transactions: IndexedTransaction[];
  paging: Paging;
  source: SourceInfo;
}

export interface IndexerHealth {
  path: string;
  generatedAt: number;
  tipThreshold: number;
  chains: ChainHealth[];
}

export interface ApiError {
  success: false;
  error: string;
}
