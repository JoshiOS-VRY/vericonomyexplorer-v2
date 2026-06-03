import { describe, expect, it } from "@jest/globals";
import { parseAddressFromExplorerHref } from "@/lib/explorerAddressHref";
import { VERIUM_POOL_PAYOUT_ADDRESS } from "@/lib/veriumPoolExtracted";

describe("parseAddressFromExplorerHref", () => {
  it("parses vrm address paths", () => {
    expect(
      parseAddressFromExplorerHref(
        `/vrm/address/${VERIUM_POOL_PAYOUT_ADDRESS}`,
      ),
    ).toEqual({
      chainId: "vrm",
      address: VERIUM_POOL_PAYOUT_ADDRESS,
    });
  });

  it("returns null for non-address hrefs", () => {
    expect(parseAddressFromExplorerHref("/vrm/tx/abc")).toBeNull();
  });
});
