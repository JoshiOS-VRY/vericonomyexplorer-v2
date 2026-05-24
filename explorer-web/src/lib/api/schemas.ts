import { z } from "zod";

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

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
