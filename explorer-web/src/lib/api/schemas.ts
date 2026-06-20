import { z } from 'zod';

export const sourceSchema = z.object({
  label: z.string(),
  type: z.string().optional(),
  trustLevel: z.string().optional(),
  healthStatus: z.string().optional(),
  message: z.string().optional(),
});

export const chainHealthSchema = z.object({
  id: z.string(),
  ticker: z.string().optional(),
  name: z.string().optional(),
  consensus: z.string().nullable().optional(),
  status: z.string(),
  trusted: z.boolean(),
  trustLevel: z.string().optional(),
  message: z.string(),
  reasons: z.array(z.string()).optional(),
  checks: z.record(z.string(), z.boolean()),
  heights: z.object({
    bestRpcHeight: z.number().nullable(),
    minIndexedHeight: z.number().nullable(),
    maxIndexedHeight: z.number().nullable(),
    lastIndexedHeight: z.number().nullable(),
    blocksBehind: z.number().nullable(),
    tipThreshold: z.number().optional(),
  }),
  counts: z.object({
    indexedBlockCount: z.number(),
    expectedBlockCount: z.number(),
    gapCount: z.number(),
    unresolvedSpendCount: z.number(),
    addressCount: z.number(),
  }),
  syncState: z
    .object({
      status: z.string().nullable(),
      statusMessage: z.string().nullable(),
      updatedAt: z.number().nullable(),
      lastIndexedHash: z.string().nullable(),
    })
    .optional(),
  sourceLabels: z.record(z.string(), z.string()),
  explorerStatus: z
    .object({
      label: z.string(),
      message: z.string(),
      syncing: z.boolean(),
      blocksBehind: z.number().optional(),
    })
    .optional(),
});

export const pagingSchema = z.object({
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
});

export const chainSummarySchema = z.object({
  chainId: z.string(),
  health: chainHealthSchema,
  latestBlocks: z.array(z.record(z.string(), z.unknown())),
  recentTransactions: z.array(z.record(z.string(), z.unknown())),
  source: sourceSchema,
});

export const indexerHealthSchema = z.object({
  path: z.string(),
  generatedAt: z.number(),
  tipThreshold: z.number(),
  chains: z.array(chainHealthSchema),
});

export const richlistSchema = z.object({
  chainId: z.string(),
  trusted: z.boolean(),
  enabled: z.boolean().optional(),
  message: z.string().optional(),
  source: sourceSchema,
  health: chainHealthSchema.optional(),
  paging: pagingSchema.optional(),
  items: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export const leaderboardSchema = z.object({
  chainId: z.string(),
  trusted: z.boolean(),
  enabled: z.boolean().optional(),
  message: z.string().optional(),
  backfillRequired: z.boolean().optional(),
  source: sourceSchema,
  health: chainHealthSchema.optional(),
  label: z.string().optional(),
  period: z
    .object({
      type: z.string(),
      start: z.number(),
      end: z.number(),
    })
    .optional(),
  sort: z.string().optional(),
  paging: pagingSchema.optional(),
  items: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export const minersSchema = z.object({
  chainId: z.string(),
  trusted: z.boolean(),
  enabled: z.boolean().optional(),
  message: z.string().optional(),
  source: sourceSchema,
  health: chainHealthSchema.optional(),
  label: z.string().optional(),
  period: z
    .object({
      type: z.string(),
      start: z.number().nullable().optional(),
      end: z.number(),
    })
    .optional(),
  paging: pagingSchema.optional(),
  items: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

const minerChartSeriesSchema = z.object({
  id: z.string(),
  address: z.string().nullable().optional(),
  label: z.string(),
});

export const minerShareTrendSchema = z.object({
  chainId: z.string(),
  trusted: z.boolean().optional(),
  enabled: z.boolean().optional(),
  message: z.string().optional(),
  source: sourceSchema,
  period: z
    .object({
      type: z.string(),
      start: z.number().nullable().optional(),
      end: z.number(),
    })
    .optional(),
  groupBy: z.string().optional(),
  series: z.array(minerChartSeriesSchema).optional().default([]),
  points: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export const minerBlockDistributionSchema = z.object({
  chainId: z.string(),
  trusted: z.boolean().optional(),
  enabled: z.boolean().optional(),
  message: z.string().optional(),
  source: sourceSchema,
  period: z
    .object({
      type: z.string(),
      start: z.number().nullable().optional(),
      end: z.number(),
    })
    .optional(),
  blockWindow: z
    .object({
      count: z.number(),
      fromHeight: z.number().nullable(),
      toHeight: z.number().nullable(),
    })
    .optional(),
  totalBlocks: z.number().optional().default(0),
  segments: z
    .array(
      z.object({
        id: z.string(),
        address: z.string().nullable().optional(),
        label: z.string(),
        blocks: z.number(),
        sharePct: z.number(),
      })
    )
    .optional()
    .default([]),
});

const amountSchema = z.object({
  amount: z.string(),
  ticker: z.string(),
});

export const transactionResultSchema = z.object({
  found: z.boolean(),
  chainId: z.string().optional(),
  txid: z.string().optional(),
  trusted: z.boolean().optional(),
  transaction: z
    .object({
      txid: z.string(),
      blockHeight: z.number(),
      blockHash: z.string().optional(),
      txIndex: z.number(),
      time: z.number().nullable(),
      isCoinbase: z.boolean().optional(),
      isCoinstake: z.boolean().optional(),
      source: z.string().optional(),
    })
    .optional(),
  inputs: z.array(z.record(z.string(), z.unknown())).default([]),
  outputs: z.array(z.record(z.string(), z.unknown())).default([]),
  addressEvents: z.array(z.record(z.string(), z.unknown())).default([]),
  totals: z
    .object({
      inputAtomic: z.string(),
      outputAtomic: z.string(),
      feeAtomic: z.string(),
      input: amountSchema,
      output: amountSchema,
      fee: amountSchema,
    })
    .optional(),
  confirmations: z.number().nullable().optional(),
  siblings: z
    .object({
      prevTxid: z.string().nullable(),
      nextTxid: z.string().nullable(),
    })
    .optional(),
  changeOutputs: z.array(z.number()).optional(),
  source: sourceSchema,
});

export const blockResultSchema = z.object({
  found: z.boolean(),
  chainId: z.string().optional(),
  query: z.string().optional(),
  trusted: z.boolean().optional(),
  block: z.record(z.string(), z.unknown()).optional(),
  transactions: z.array(z.record(z.string(), z.unknown())).default([]),
  paging: pagingSchema.optional(),
  confirmations: z.number().nullable().optional(),
  coinbase: z
    .object({
      txid: z.string(),
      rewardAtomic: z.string(),
      reward: amountSchema,
    })
    .nullable()
    .optional(),
  totals: z
    .object({
      feeAtomic: z.string().nullable().optional(),
      fee: amountSchema.nullable().optional(),
      outputValueAtomic: z.string().nullable().optional(),
      outputValue: amountSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  source: sourceSchema,
});

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
