import { describe, expect, it } from "@jest/globals";
import { pickBlockPageBase } from "@/lib/chainBlocksPage";
import type { IndexedBlock } from "@/lib/api/types";

function block(height: number): IndexedBlock {
  return { height, hash: `hash-${height}`, time: height, txCount: 1 };
}

describe("pickBlockPageBase", () => {
  it("prefers a non-empty filled page over live blocks", () => {
    const filled = [block(100), block(99)];
    const live = [block(100)];

    expect(pickBlockPageBase(filled, live)).toBe(filled);
  });

  it("falls back to live blocks when filled page is empty", () => {
    const live = [block(100), block(99)];

    expect(pickBlockPageBase([], live)).toBe(live);
  });

  it("falls back to live blocks when filled page is null", () => {
    const live = [block(100)];

    expect(pickBlockPageBase(null, live)).toBe(live);
  });
});
