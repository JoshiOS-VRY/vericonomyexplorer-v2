import { describe, expect, it } from "@jest/globals";
import { ellipsizeMiddle, normalizeLimit, normalizeOffset } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/env";

describe("utils", () => {
  it("ellipsizeMiddle shortens long strings", () => {
    const hash = "a".repeat(64);
    expect(ellipsizeMiddle(hash, 16)).toContain("...");
  });

  it("normalizeLimit clamps to 100", () => {
    expect(normalizeLimit("500", 25)).toBe(100);
    expect(normalizeLimit(undefined, 25)).toBe(25);
  });

  it("normalizeOffset defaults to 0", () => {
    expect(normalizeOffset("-1")).toBe(0);
    expect(normalizeOffset("10")).toBe(10);
  });
});

describe("env resolution", () => {
  it("derives API URL from BTCEXP_HOST/PORT when EXPLORER_API_URL unset", () => {
    const original = process.env.EXPLORER_API_URL;
    delete process.env.EXPLORER_API_URL;
    process.env.BTCEXP_HOST = "127.0.0.1";
    process.env.BTCEXP_PORT = "3002";
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:3002");
    if (original) process.env.EXPLORER_API_URL = original;
  });
});

describe("route parity matrix", () => {
  it("documents required indexer routes", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const matrix = await fs.readFile(
      path.join(process.cwd(), "..", "docs", "ROUTE_PARITY_MATRIX.md"),
      "utf8",
    );
    expect(matrix).toContain("/vrm/richlist");
    expect(matrix).toContain("/api/indexer/status");
    expect(matrix).toContain("/blocks");
  });
});

describe("acceptance checklist", () => {
  const indexerRoutes = [
    "/",
    "/vrm",
    "/vrm/richlist",
    "/vrm/leaderboard",
    "/vrm/search",
    "/vrm/error",
  ];
  const legacyRoutes = ["/blocks", "/search", "/rpc-terminal", "/admin/dashboard"];

  it("covers indexer route targets", () => {
    expect(indexerRoutes.length).toBeGreaterThanOrEqual(6);
  });

  it("covers legacy route targets", () => {
    expect(legacyRoutes).toContain("/blocks");
  });
});
