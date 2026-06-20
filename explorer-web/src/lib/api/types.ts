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
  extractedByLink?: string | null;
  interestRatePercent?: number | null;
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
  summary?: TransactionSummary;
}

export interface TransactionSummary {
  outputCount: number;
  totalOutputAtomic: string;
  totalOutput: AmountDisplay;
  feeAtomic?: string;
  fee?: AmountDisplay;
}

export interface BlockCoinbaseSummary {
  txid: string;
  rewardAtomic: string;
  reward: AmountDisplay;
}

export interface BlockTotals {
  feeAtomic?: string;
  fee?: AmountDisplay;
  outputValueAtomic: string;
  outputValue: AmountDisplay;
}

export interface Paging {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface BlocksPageResult {
  chainId: string;
  enabled?: boolean;
  items: IndexedBlock[];
  paging: Paging;
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
  backfillRequired?: boolean;
  source: SourceInfo;
  health?: ChainHealth;
  label?: string;
  period?: { type: string; start: number; end: number };
  sort?: string;
  paging?: Paging;
  items: LeaderboardItem[];
}

export interface MinersLeaderboardItem {
  rank: number;
  address: string;
  minedAtomic: string;
  mined: AmountDisplay;
  blockCount: number;
  lastMinedHeight: number | null;
}

export interface MinersLeaderboardResult {
  chainId: string;
  trusted: boolean;
  enabled?: boolean;
  message?: string;
  source: SourceInfo;
  health?: ChainHealth;
  label?: string;
  period?: { type: string; start: number | null; end: number };
  paging?: Paging;
  items: MinersLeaderboardItem[];
}

export interface MinerChartSeries {
  id: string;
  address: string | null;
  label: string;
}

export interface MinerShareTrendPoint {
  label: string;
  startTime: number;
  endTime: number;
  totalBlocks: number;
  [seriesId: string]: string | number;
}

export interface MinerShareTrendResult {
  chainId: string;
  trusted?: boolean;
  enabled?: boolean;
  message?: string;
  source: SourceInfo;
  period?: { type: string; start: number | null; end: number };
  groupBy?: string;
  series: MinerChartSeries[];
  points: MinerShareTrendPoint[];
}

export interface MinerDistributionSegment {
  id: string;
  address: string | null;
  label: string;
  blocks: number;
  sharePct: number;
}

export interface MinerBlockDistributionResult {
  chainId: string;
  trusted?: boolean;
  enabled?: boolean;
  message?: string;
  source: SourceInfo;
  period?: {
    type: string;
    start?: number | null;
    end: number;
  };
  blockWindow?: {
    count: number;
    fromHeight: number | null;
    toHeight: number | null;
  };
  totalBlocks: number;
  segments: MinerDistributionSegment[];
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

export interface AddressRichlistInfo {
  enabled: boolean;
  eligible: boolean;
  rank: number | null;
  total: number;
  percentile: number | null;
}

export interface AddressBalanceInfo {
  balance: AmountDisplay;
  balanceAtomic?: string;
  totalReceived: AmountDisplay;
  totalSent: AmountDisplay;
  txCount: number;
  firstSeenHeight?: number | null;
  firstSeenTime?: number | null;
  lastSeenHeight?: number | null;
}

export interface AddressActivityCategory {
  id: 'mined' | 'staked' | 'received' | 'spent';
  label: string;
}

export interface AddressBalanceActivityBucket {
  startTime: number;
  endTime: number;
  label: string;
  minedAtomic: string;
  stakedAtomic: string;
  receivedAtomic: string;
  spentAtomic: string;
  mined: AmountDisplay;
  staked: AmountDisplay;
  received: AmountDisplay;
  spent: AmountDisplay;
  minedAmount: number;
  stakedAmount: number;
  receivedAmount: number;
  spentAmount: number;
  ticker: string;
}

export interface AddressBalanceHistoryPoint {
  height: number | null;
  time: number;
  balanceAtomic: string;
  balance: AmountDisplay;
  balanceAmount: number;
  ticker: string;
}

export type AddressBalanceChartView = 'activity' | 'balance';

export interface AddressBalanceHistoryResult {
  chainId: string;
  address: string;
  found: boolean;
  trusted?: boolean;
  source: SourceInfo;
  truncated: boolean;
  eventCount?: number;
  maxEvents?: number;
  since?: number | null;
  categories: AddressActivityCategory[];
  buckets: AddressBalanceActivityBucket[];
  points: AddressBalanceHistoryPoint[];
  currentBalanceAtomic: string;
}

export type AddressBalanceHistoryPeriodId = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ChainActivityCategory {
  id: 'mined' | 'staked' | 'received';
  label: string;
}

export interface ChainActivityBucket {
  startTime: number;
  endTime: number;
  label: string;
  minedCount: number;
  stakedCount: number;
  receivedCount: number;
  blockCount: number;
}

export type ChainActivityChartView = 'activity' | 'blocks';

export interface ChainActivityHistoryResult {
  chainId: string;
  trusted?: boolean;
  backfillRequired?: boolean;
  source: SourceInfo;
  since?: number | null;
  categories: ChainActivityCategory[];
  buckets: ChainActivityBucket[];
}

export interface VrmDashboardPayload {
  summary: ChainSummary;
  richlist: RichlistResult;
  leaderboard: LeaderboardResult;
  miners: MinersLeaderboardResult;
  network?: VrmNetworkStats;
  market?: ChainMarket;
  activityHistory?: ChainActivityHistoryResult;
  fetchedAt?: string;
}

export interface AddressUtxoItem {
  txid: string;
  vout: number;
  valueAtomic: string;
  value: AmountDisplay;
  blockHeight: number;
  time: number;
}

export interface AddressUtxosResult {
  chainId: string;
  address: string;
  trusted?: boolean;
  source: SourceInfo;
  summary: {
    utxoCount: number;
    totalValueAtomic: string;
    totalValue: AmountDisplay;
  };
  paging: Paging;
  items: AddressUtxoItem[];
}

export interface AddressResult {
  chainId?: string;
  found: boolean;
  address: string;
  trusted?: boolean;
  balance: AddressBalanceInfo;
  richlist: AddressRichlistInfo;
  transactions: AddressTransaction[];
  paging: Paging;
  source: SourceInfo;
}

export interface TxInput {
  n: number;
  prevTxid?: string | null;
  prevVout?: number | null;
  address: string | null;
  value: AmountDisplay | null;
  valueAtomic?: string | null;
  source?: string;
  resolved?: boolean;
}

export interface TxOutput {
  n: number;
  address: string | null;
  scriptType?: string;
  scriptPubKey?: string | null;
  value: AmountDisplay;
  valueAtomic?: string;
  isSpent: boolean;
  spentByTxid?: string | null;
  spentByVin?: number | null;
  spentHeight?: number | null;
}

export interface AddressEvent {
  address: string;
  eventType: string;
  delta: AmountDisplay;
  deltaAtomic: string;
}

export interface TransactionTotals {
  inputAtomic: string;
  outputAtomic: string;
  feeAtomic: string;
  input: AmountDisplay;
  output: AmountDisplay;
  fee: AmountDisplay;
}

export interface TransactionSiblings {
  prevTxid: string | null;
  nextTxid: string | null;
}

export interface TransactionResult {
  found: boolean;
  chainId?: string;
  txid?: string;
  trusted?: boolean;
  transaction?: IndexedTransaction & { txIndex: number };
  inputs: TxInput[];
  outputs: TxOutput[];
  addressEvents: AddressEvent[];
  totals?: TransactionTotals;
  confirmations?: number | null;
  siblings?: TransactionSiblings;
  changeOutputs?: number[];
  source: SourceInfo;
}

export interface TransactionRelatedAddressGroup {
  address: string;
  transactions: AddressTransaction[];
}

export interface TransactionRelatedAddressesResult {
  found: boolean;
  chainId?: string;
  txid?: string;
  trusted?: boolean;
  limit?: number;
  items: TransactionRelatedAddressGroup[];
  source: SourceInfo;
}

export interface BlockResult {
  found: boolean;
  chainId?: string;
  query?: string;
  trusted?: boolean;
  block?: IndexedBlock;
  transactions: IndexedTransaction[];
  paging: Paging;
  confirmations?: number | null;
  coinbase?: BlockCoinbaseSummary | null;
  totals?: BlockTotals;
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

export interface PriceHistoryPoint {
  time: number;
  value: number;
}

export interface ChainMarket {
  usd: number | null;
  btc: number | null;
  marketCap: number | null;
  volume24h: number | null;
  change24h: number | null;
  circulatingSupply: number | null;
  source: 'livecoinwatch' | 'coingecko' | 'computed' | 'unavailable';
  updatedAt: string | null;
  priceHistory24h: PriceHistoryPoint[];
}

export interface VrmNetworkStats {
  hashrateKhPerMin: number | null;
  hashrateSource?: 'networkhashps' | 'nethashrate' | 'getnetworkhashps' | 'difficulty' | null;
  avgBlockTimeMin: number | null;
  blocksPerHour: number | null;
  difficulty: number | null;
  blocks: number | null;
  supply: number | null;
  maxSupply: number | null;
}

export interface VrcNetworkStats {
  difficulty: number | null;
  blocks: number | null;
  supply: number | null;
  maxSupply: number | null;
  interestRatePercent: number | null;
  netStakeWeight: number | null;
  percentStaked: number | null;
  expectedStakeTimeSeconds: number | null;
}

export interface HomeChainSection<TNetwork> {
  summary: ChainSummary;
  richlist: RichlistResult;
  market: ChainMarket;
  network: TNetwork;
}

export interface HomePayload {
  vrm: HomeChainSection<VrmNetworkStats>;
  vrc: HomeChainSection<VrcNetworkStats>;
  vrmLeaderboard: LeaderboardResult;
  fetchedAt: string;
}

export interface HomeShellPayload {
  vrm: {
    summary: ChainSummary;
    richlist: RichlistResult;
  };
  vrc: {
    summary: ChainSummary;
    richlist: RichlistResult;
  };
  vrmLeaderboard: LeaderboardResult;
  fetchedAt: string;
}

export interface HomeNetworkPayload {
  vrm: VrmNetworkStats;
  vrc: VrcNetworkStats;
  fetchedAt: string;
}

export interface HomeMarketPayload {
  vrm: ChainMarket;
  vrc: ChainMarket;
  fetchedAt: string;
}

export interface PeerEntry {
  id: number;
  address: string;
  ip: string;
  port: number | null;
  subversion: string;
  protocolVersion: number | null;
  inbound: boolean;
  connectedSeconds: number | null;
  lastSeen: string | null;
  pingMs: number | null;
}

export interface PeerVersionGroup {
  subversion: string;
  protocolVersion: number | null;
  count: number;
}

export interface PeersResult {
  chainId: string;
  fetchedAt: string;
  total: number;
  inbound: number;
  outbound: number;
  versions: PeerVersionGroup[];
  peers: PeerEntry[];
}
