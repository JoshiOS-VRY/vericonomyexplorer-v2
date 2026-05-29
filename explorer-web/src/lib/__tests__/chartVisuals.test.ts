import { describe, expect, it } from "@jest/globals";
import { formatCompactAxisValue } from "@/lib/chartVisuals";

describe("formatCompactAxisValue", () => {
  it("formats zero as 0", () => {
    expect(formatCompactAxisValue(0)).toBe("0");
    expect(formatCompactAxisValue(-0)).toBe("0");
  });

  it("uses compact suffixes for large values", () => {
    expect(formatCompactAxisValue(1_500)).toBe("1.50K");
    expect(formatCompactAxisValue(2_500_000)).toBe("2.5M");
  });

  it("uses exponential notation for tiny non-zero values", () => {
    expect(formatCompactAxisValue(0.00098)).toBe("9.80e-4");
  });
});
