import { describe, expect, it } from "@jest/globals";
import {
  isVeriumPoolExtracted,
  VERIUM_POOL_DISPLAY_NAME,
} from "@/lib/veriumPoolExtracted";

describe("isVeriumPoolExtracted", () => {
  it("matches the Vericonomy pool display name", () => {
    expect(
      isVeriumPoolExtracted({ extractedBy: VERIUM_POOL_DISPLAY_NAME }),
    ).toBe(true);
  });

  it("matches pool.vericonomy.com links", () => {
    expect(
      isVeriumPoolExtracted({
        extractedBy: "Other",
        extractedByLink: "https://pool.vericonomy.com/",
      }),
    ).toBe(true);
  });

  it("does not match other mining pools", () => {
    expect(
      isVeriumPoolExtracted({
        extractedBy: "VeriumPool",
        extractedByLink: "https://veriumpool.com",
      }),
    ).toBe(false);
  });
});
