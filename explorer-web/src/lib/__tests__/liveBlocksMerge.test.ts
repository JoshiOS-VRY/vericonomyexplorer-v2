import { describe, expect, it } from "@jest/globals";
import {
  areDisplayBlocksEqual,
  createOptimisticTipBlock,
  enrichBlocksFromPrevious,
  isIndexedBlockTableReady,
  isOptimisticTipBlock,
  mergeBlocksForDisplay,
  shouldApplyFetchedBlocks,
  shouldApplyOptimisticTip,
} from "@/lib/liveBlocksMerge";
import type { IndexedBlock } from "@/lib/api/types";

function block(height: number, hash = `hash-${height}`): IndexedBlock {
  return {
    height,
    hash,
    time: height,
    txCount: 1,
    size: 512,
    difficulty: "1000",
    extractedBy: "miner",
    interestRatePercent: 1.5,
  };
}

function tipStub(height: number, hash = `hash-${height}`): IndexedBlock {
  return { height, hash, time: height, txCount: 0 };
}

describe("liveBlocksMerge", () => {
  it("only allows optimistic tips for the next consecutive height", () => {
    expect(shouldApplyOptimisticTip(101, 100)).toBe(true);
    expect(shouldApplyOptimisticTip(102, 100)).toBe(false);
    expect(shouldApplyOptimisticTip(100, 100)).toBe(false);
  });

  it("rejects stale fetched block lists", () => {
    expect(shouldApplyFetchedBlocks(105, 104)).toBe(true);
    expect(shouldApplyFetchedBlocks(104, 105)).toBe(false);
  });

  it("sorts fetched blocks by height before applying", () => {
    const merged = enrichBlocksFromPrevious(
      [block(100, "prev-hash")],
      [block(98), block(99), block(100, "next-hash")],
    );

    expect(merged.map((entry) => entry.height)).toEqual([100, 99, 98]);
    expect(merged[0]?.extractedBy).toBe("miner");
  });

  it("rejects tip-stream stub rows for full table readiness", () => {
    expect(isIndexedBlockTableReady(tipStub(101), "vrm")).toBe(false);
    expect(isIndexedBlockTableReady(block(101), "vrm")).toBe(true);
    expect(isIndexedBlockTableReady(block(101), "vrc")).toBe(true);
    expect(
      isIndexedBlockTableReady(
        { ...block(101), interestRatePercent: null, extractedBy: null },
        "vrc",
      ),
    ).toBe(true);
  });

  it("keeps an optimistic tip stub at the top for home display", () => {
    const stub = createOptimisticTipBlock({
      height: 101,
      hash: "tip-hash",
      time: 1_700_000_000,
    });
    expect(isOptimisticTipBlock(stub, "vrm")).toBe(true);

    const displayed = mergeBlocksForDisplay(
      [stub, block(100), block(99)],
      "vrm",
    );
    expect(displayed.map((entry) => entry.height)).toEqual([101, 100, 99]);
    expect(isIndexedBlockTableReady(displayed[0]!, "vrm")).toBe(false);
  });

  it("detects enriched tip rows with the same hash", () => {
    const stub = tipStub(101, "same-hash");
    const enriched = block(101, "same-hash");

    expect(areDisplayBlocksEqual([stub], [stub])).toBe(true);
    expect(areDisplayBlocksEqual([stub], [enriched])).toBe(false);
  });

  it("drops non-tip optimistic rows from display", () => {
    const staleStub = { ...tipStub(98), time: 98 };
    const displayed = mergeBlocksForDisplay(
      [block(100), staleStub, block(99)],
      "vrm",
    );
    expect(displayed.map((entry) => entry.height)).toEqual([100, 99]);
  });
});
